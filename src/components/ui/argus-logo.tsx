"use client";

interface ArgusLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function ArgusLogo({
  size = 20,
  className = "",
  animate = true,
}: ArgusLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animate ? "animate-shield-pulse" : ""} ${className}`}
    >
      {/* Shield body */}
      <path
        d="M16 1.5L3.5 7v9.5c0 7 5.2 13.2 12.5 14.5 7.3-1.3 12.5-7.5 12.5-14.5V7L16 1.5z"
        fill="#ef4444"
      />
      {/* Shield inner */}
      <path
        d="M16 4L5.5 8.5v8c0 6 4.5 11.3 10.5 12.5 6-1.2 10.5-6.5 10.5-12.5v-8L16 4z"
        fill="#060a13"
      />
      {/* Eye almond */}
      <ellipse
        cx="16"
        cy="16"
        rx="7.5"
        ry="5"
        stroke="#ef4444"
        strokeWidth="1.2"
      />
      {/* Iris ring */}
      <circle cx="16" cy="16" r="3" stroke="#ef4444" strokeWidth="1" />
      {/* Pupil */}
      <circle cx="16" cy="16" r="1.5" fill="#ef4444" />
      {/* Scan lines */}
      <line
        x1="16"
        y1="8"
        x2="16"
        y2="6"
        stroke="#ef4444"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <line
        x1="16"
        y1="24"
        x2="16"
        y2="26"
        stroke="#ef4444"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <line
        x1="6"
        y1="16"
        x2="4"
        y2="16"
        stroke="#ef4444"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <line
        x1="26"
        y1="16"
        x2="28"
        y2="16"
        stroke="#ef4444"
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  );
}
