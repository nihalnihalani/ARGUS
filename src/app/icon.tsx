import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 1.5L3.5 7v9.5c0 7 5.2 13.2 12.5 14.5 7.3-1.3 12.5-7.5 12.5-14.5V7L16 1.5z"
            fill="#ef4444"
          />
          <path
            d="M16 4L5.5 8.5v8c0 6 4.5 11.3 10.5 12.5 6-1.2 10.5-6.5 10.5-12.5v-8L16 4z"
            fill="#060a13"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="7.5"
            ry="5"
            stroke="#ef4444"
            strokeWidth="1.2"
          />
          <circle cx="16" cy="16" r="3" stroke="#ef4444" strokeWidth="1" />
          <circle cx="16" cy="16" r="1.5" fill="#ef4444" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
