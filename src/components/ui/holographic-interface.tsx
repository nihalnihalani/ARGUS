"use client";

import { useRef, useId, type ReactNode, type MouseEvent } from "react";

interface BentoItemProps {
  title: string;
  description: string;
  icon: ReactNode;
  accentColor?: string;
  className?: string;
  children?: ReactNode;
}

export function BentoItem({
  title,
  description,
  icon,
  accentColor = "rgba(239, 68, 68, 0.6)",
  className,
  children,
}: BentoItemProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const gradientId = `bento-grad-${rawId.replace(/:/g, "")}`;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform =
      "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  return (
    <div
      ref={cardRef}
      className={`bento-item group ${className || ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated SVG border that traces on hover */}
      <svg
        className="animated-border"
        viewBox="0 0 200 200"
        fill="none"
        preserveAspectRatio="none"
      >
        <rect
          x="1"
          y="1"
          width="198"
          height="198"
          rx="11"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          pathLength="1"
        />
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="200"
            y2="200"
          >
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.4)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Spotlight follows cursor */}
      <div className="bento-spotlight" />

      {/* Rotating aurora background */}
      <div className="aurora-bg" />

      {/* Card content */}
      <div className="relative z-10 flex flex-col h-full p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 group-hover:text-red-400 transition-colors duration-300">
            {icon}
          </div>
          <h3 className="text-[11px] font-semibold text-slate-300 tracking-tight uppercase">
            {title}
          </h3>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed flex-1">
          {description}
        </p>
        {children && <div className="mt-auto pt-2">{children}</div>}
      </div>
    </div>
  );
}
