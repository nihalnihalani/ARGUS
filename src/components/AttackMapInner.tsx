'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import type { MapViewState, PickingInfo } from '@deck.gl/core';
import type { AttackArc } from '@/lib/types';
import 'maplibre-gl/dist/maplibre-gl.css';

// --- Severity to RGBA ---

function severityToColor(severity: string): [number, number, number, number] {
  switch (severity) {
    case 'critical':
      return [239, 68, 68, 255];
    case 'high':
      return [249, 115, 22, 255];
    case 'medium':
      return [234, 179, 8, 255];
    case 'low':
      return [34, 197, 94, 255];
    default:
      return [107, 114, 128, 255];
  }
}

// --- Point data for scatter/heatmap ---

interface PointData {
  lon: number;
  lat: number;
  isTarget: boolean;
  name: string;
  severity?: string;
}

// --- Props ---

interface AttackMapProps {
  arcs: AttackArc[];
  width?: number;
  height?: number;
}

const INITIAL_VIEW_STATE: MapViewState = {
  latitude: 30,
  longitude: -20,
  zoom: 1.5,
  pitch: 35,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function AttackMapInner({ arcs, width, height }: AttackMapProps) {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [animationTime, setAnimationTime] = useState(0);
  const rafRef = useRef<number>(0);

  // Pulse animation loop
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      setAnimationTime((t) => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Derive points from arcs
  const points = useMemo<PointData[]>(() => {
    const originMap = new Map<string, PointData>();
    const targetMap = new Map<string, PointData>();
    for (const arc of arcs) {
      const oKey = `${arc.sourceLat},${arc.sourceLon}`;
      if (!originMap.has(oKey)) {
        originMap.set(oKey, {
          lon: arc.sourceLon,
          lat: arc.sourceLat,
          isTarget: false,
          name: arc.actorName,
          severity: arc.severity,
        });
      }
      const tKey = `${arc.targetLat},${arc.targetLon}`;
      if (!targetMap.has(tKey)) {
        targetMap.set(tKey, {
          lon: arc.targetLon,
          lat: arc.targetLat,
          isTarget: true,
          name: arc.targetOrg,
          severity: arc.severity,
        });
      }
    }
    return [...originMap.values(), ...targetMap.values()];
  }, [arcs]);

  const origins = useMemo(() => points.filter((p) => !p.isTarget), [points]);

  // Pulse factor for scatterplot radius
  const pulseFactor = 1 + 0.3 * Math.sin(animationTime * 0.05);

  // Build layers
  const layers = useMemo(() => {
    const result = [];

    // Heatmap (origins only)
    if (origins.length > 0) {
      result.push(
        new HeatmapLayer<PointData>({
          id: 'threat-heatmap',
          data: origins,
          getPosition: (d) => [d.lon, d.lat],
          getWeight: 1,
          radiusPixels: 60,
          intensity: 1,
          threshold: 0.1,
          colorRange: [
            [255, 255, 178],
            [254, 204, 92],
            [253, 141, 60],
            [240, 59, 32],
            [189, 0, 38],
          ],
        })
      );
    }

    // Arc layer
    if (arcs.length > 0) {
      result.push(
        new ArcLayer<AttackArc>({
          id: 'attack-arcs',
          data: arcs,
          getSourcePosition: (d) => [d.sourceLon, d.sourceLat],
          getTargetPosition: (d) => [d.targetLon, d.targetLat],
          getSourceColor: (d) => severityToColor(d.severity),
          getTargetColor: [255, 0, 0, 200],
          getWidth: 2,
          getHeight: 0.5,
          greatCircle: true,
          pickable: true,
        })
      );
    }

    // Scatterplot (pulsing dots)
    if (points.length > 0) {
      result.push(
        new ScatterplotLayer<PointData>({
          id: 'threat-origins',
          data: points,
          getPosition: (d) => [d.lon, d.lat],
          getFillColor: (d) =>
            d.isTarget ? [34, 197, 94, 200] : [239, 68, 68, 200],
          getRadius: (d) => {
            const baseRadius = d.isTarget ? 50000 : 30000;
            return baseRadius * pulseFactor;
          },
          radiusMinPixels: 4,
          radiusMaxPixels: 15,
          pickable: true,
          updateTriggers: {
            getRadius: [pulseFactor],
          },
        })
      );
    }

    return result;
  }, [arcs, points, origins, pulseFactor]);

  // Tooltip
  const getTooltip = useCallback(({ object, layer }: PickingInfo) => {
    if (!object) return null;
    if (layer?.id === 'attack-arcs') {
      const arc = object as AttackArc;
      return {
        html: `<div style="padding:8px;max-width:240px">
          <div style="font-weight:600;margin-bottom:4px;color:#f9fafb">${arc.actorName} → ${arc.targetOrg}</div>
          <div style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:${
            arc.severity === 'critical'
              ? '#ef4444'
              : arc.severity === 'high'
              ? '#f97316'
              : arc.severity === 'medium'
              ? '#eab308'
              : '#22c55e'
          };color:#fff;margin-bottom:4px">${arc.severity.toUpperCase()}</div>
          ${arc.cves.length > 0 ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">${arc.cves.join(', ')}</div>` : ''}
        </div>`,
        style: {
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#f9fafb',
          fontSize: '12px',
        },
      };
    }
    if (layer?.id === 'threat-origins') {
      const pt = object as PointData;
      return {
        html: `<div style="padding:6px">
          <div style="font-weight:600;color:#f9fafb">${pt.name}</div>
          <div style="font-size:11px;color:#9ca3af">${pt.isTarget ? 'Target' : 'Threat Origin'}</div>
        </div>`,
        style: {
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#f9fafb',
          fontSize: '12px',
        },
      };
    }
    return null;
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-lg border border-[#374151]"
      style={{ width: width ?? '100%', height: height ?? '100%' }}
    >
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e) => setViewState(e.viewState as MapViewState)}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
      >
        <MapLibreMap mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* Empty state */}
      {arcs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[#6b7280] text-sm">No attack arcs to display</div>
            <div className="text-[#4b5563] text-xs mt-1">Threat data will appear when available</div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {arcs.length > 0 && (
        <div className="absolute top-3 right-3 bg-[#1f2937]/80 border border-[#374151] rounded-lg px-2.5 py-1.5 text-[10px] pointer-events-none">
          <div className="text-[#ef4444] font-mono">{arcs.length} active arcs</div>
          <div className="text-[#9ca3af]">{points.filter((p) => !p.isTarget).length} origins / {points.filter((p) => p.isTarget).length} targets</div>
        </div>
      )}
    </div>
  );
}
