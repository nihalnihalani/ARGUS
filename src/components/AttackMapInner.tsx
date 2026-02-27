'use client';

import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  Map as MapComponent,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MapControls,
  MapRoute,
} from '@/components/ui/map';
import type { AttackArc } from '@/lib/types';

// --- Severity config ---

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const SEVERITY_RING: Record<string, string> = {
  critical: 'ring-red-500/60',
  high: 'ring-orange-500/50',
  medium: 'ring-yellow-500/40',
  low: 'ring-green-500/40',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

// --- Great circle interpolation ---

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function greatCirclePoints(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  steps = 64
): [number, number][] {
  const φ1 = toRad(lat1), λ1 = toRad(lon1);
  const φ2 = toRad(lat2), λ2 = toRad(lon2);
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
    )
  );
  if (d < 1e-10) return [[lon1, lat1], [lon2, lat2]];

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    coords.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return coords;
}

// --- Dedup points ---

interface PointData {
  lon: number;
  lat: number;
  isTarget: boolean;
  name: string;
  severity: string;
  cves: string[];
}

function derivePoints(arcs: AttackArc[]): PointData[] {
  const origins = new Map<string, PointData>();
  const targets = new Map<string, PointData>();

  for (const arc of arcs) {
    const oKey = `${arc.sourceLat},${arc.sourceLon}`;
    if (!origins.has(oKey)) {
      origins.set(oKey, {
        lon: arc.sourceLon, lat: arc.sourceLat,
        isTarget: false, name: arc.actorName,
        severity: arc.severity, cves: arc.cves,
      });
    }
    const tKey = `${arc.targetLat},${arc.targetLon}`;
    if (!targets.has(tKey)) {
      targets.set(tKey, {
        lon: arc.targetLon, lat: arc.targetLat,
        isTarget: true, name: arc.targetOrg,
        severity: arc.severity, cves: arc.cves,
      });
    }
  }

  return [...origins.values(), ...targets.values()];
}

// --- Props ---

interface AttackMapProps {
  arcs: AttackArc[];
}

export default function AttackMapInner({ arcs }: AttackMapProps) {
  const [is3D, setIs3D] = useState(true);
  const points = useMemo(() => derivePoints(arcs), [arcs]);

  const arcRoutes = useMemo(
    () =>
      arcs.map((arc) => ({
        id: arc.id,
        color: SEVERITY_COLORS[arc.severity] ?? '#6b7280',
        coords: greatCirclePoints(
          arc.sourceLon, arc.sourceLat,
          arc.targetLon, arc.targetLat
        ),
      })),
    [arcs]
  );

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0A0E17' }}>
      <MapComponent
        center={[-20, 30]}
        zoom={is3D ? 1.5 : 1}
        pitch={is3D ? 45 : 0}
        maxPitch={60}
      >
        {/* Controls */}
        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showFullscreen
        />

        {/* 2D/3D Toggle */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setIs3D(!is3D)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(10,14,23,0.8)] backdrop-blur-md border border-white/[0.04] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors shadow-lg pointer-events-auto"
          >
            <Layers className="h-3.5 w-3.5" />
            {is3D ? '3D View' : '2D Map'}
          </button>
        </div>

        {/* Great circle arc routes */}
        {arcRoutes.map((route) => (
          <MapRoute
            key={route.id}
            coordinates={route.coords}
            color={route.color}
            width={2}
            opacity={0.7}
            animated={true}
          />
        ))}

        {/* Origin + target markers */}
        {points.map((pt) => (
          <MapMarker
            key={`${pt.name}-${pt.lon}-${pt.lat}`}
            longitude={pt.lon}
            latitude={pt.lat}
          >
            <MarkerContent>
              {pt.isTarget ? (
                <TargetMarker severity={pt.severity} />
              ) : (
                <OriginMarker severity={pt.severity} />
              )}
            </MarkerContent>
            <MarkerTooltip
              className="!bg-[#1f2937] !text-gray-100 border border-[#374151] !px-3 !py-2 shadow-xl"
            >
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-[11px] text-gray-50">{pt.name}</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${SEVERITY_BADGE[pt.severity] ?? ''}`}
                  >
                    {pt.severity}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {pt.isTarget ? 'Target' : 'Threat Origin'}
                  </span>
                </div>
                {pt.cves.length > 0 && (
                  <div className="text-[10px] text-gray-500 font-mono">
                    {pt.cves.join(', ')}
                  </div>
                )}
              </div>
            </MarkerTooltip>
          </MapMarker>
        ))}
      </MapComponent>

      {/* Empty state */}
      {arcs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[#6b7280] text-sm">No attack arcs to display</div>
            <div className="text-[#4b5563] text-xs mt-1">
              Threat data will appear when available
            </div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {arcs.length > 0 && (
        <div className="absolute top-3 right-3 pointer-events-none z-10 rounded-lg px-3 py-2"
          style={{ background: 'rgba(10, 18, 32, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
        >
          <div className="text-[#ef4444] font-mono text-[11px] font-semibold">
            {arcs.length} active arc{arcs.length !== 1 ? 's' : ''}
          </div>
          <div className="text-[#9ca3af] text-[10px]">
            {points.filter((p) => !p.isTarget).length} origins /{' '}
            {points.filter((p) => p.isTarget).length} targets
          </div>
        </div>
      )}
    </div>
  );
}

// --- Marker components ---

function OriginMarker({ severity }: { severity: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring */}
      <span
        className={`absolute h-6 w-6 rounded-full animate-ping opacity-40 ${SEVERITY_BG[severity] ?? 'bg-gray-500'}`}
      />
      {/* Outer ring */}
      <span
        className={`absolute h-5 w-5 rounded-full ring-2 ${SEVERITY_RING[severity] ?? 'ring-gray-500/40'} bg-transparent`}
      />
      {/* Inner dot */}
      <span
        className={`relative h-3 w-3 rounded-full shadow-lg ${SEVERITY_BG[severity] ?? 'bg-gray-500'}`}
      />
    </div>
  );
}

function TargetMarker({ severity }: { severity: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring */}
      <span className="absolute h-5 w-5 rounded-full animate-ping bg-emerald-400 opacity-30" />
      {/* Crosshair ring */}
      <span
        className={`absolute h-4 w-4 rounded-full border-2 border-emerald-400/70 ${
          severity === 'critical' ? 'border-red-400/70' : ''
        }`}
      />
      {/* Inner */}
      <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
    </div>
  );
}
