"use client";

import { motion } from "framer-motion";

interface RadarLoaderProps {
  size?: number;
  label?: string;
  sublabel?: string;
}

export function RadarLoader({
  size = 120,
  label = "Initializing ARGUS...",
  sublabel = "Loading knowledge graph and deploying scouts",
}: RadarLoaderProps) {
  const r = size / 2;
  const ringR = [r * 0.25, r * 0.5, r * 0.75, r];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Grid rings */}
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          fill="none"
        >
          {ringR.map((radius, i) => (
            <circle
              key={i}
              cx={r}
              cy={r}
              r={radius - 1}
              stroke="rgba(239, 68, 68, 0.12)"
              strokeWidth="1"
            />
          ))}
          {/* Crosshair lines */}
          <line
            x1={r}
            y1={0}
            x2={r}
            y2={size}
            stroke="rgba(239, 68, 68, 0.08)"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={r}
            x2={size}
            y2={r}
            stroke="rgba(239, 68, 68, 0.08)"
            strokeWidth="1"
          />
        </svg>

        {/* Sweep arm */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(239, 68, 68, 0.25) 30deg, transparent 60deg)",
            maskImage: "radial-gradient(circle, transparent 8%, black 8%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 8%, black 8%)",
          }}
        />

        {/* Expanding ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full border border-red-500/30"
          animate={{ scale: [0.3, 1], opacity: [0.6, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border border-red-500/20"
          animate={{ scale: [0.3, 1], opacity: [0.4, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeOut",
            delay: 1.5,
          }}
        />

        {/* Center dot */}
        <motion.div
          className="absolute rounded-full bg-red-500"
          style={{
            width: 8,
            height: 8,
            left: r - 4,
            top: r - 4,
            boxShadow: "0 0 12px rgba(239, 68, 68, 0.6)",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Blips — random dots on the radar */}
        {[
          { x: 0.3, y: 0.25, delay: 0.5 },
          { x: 0.7, y: 0.35, delay: 1.2 },
          { x: 0.6, y: 0.7, delay: 2.1 },
          { x: 0.25, y: 0.65, delay: 0.8 },
        ].map((blip, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-red-400"
            style={{
              width: 3,
              height: 3,
              left: size * blip.x,
              top: size * blip.y,
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: blip.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="text-center">
        <div
          className="text-[#94a3b8] text-xs font-mono tracking-wider"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="text-[#334155] text-[10px] mt-1.5 font-mono"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
