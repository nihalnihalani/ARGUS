import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060a13",
          borderRadius: 40,
        }}
      >
        <svg
          viewBox="0 0 512 512"
          width="140"
          height="140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M256 28L60 120v152c0 110 83 210 196 232 113-22 196-122 196-232V120L256 28z"
            fill="#ef4444"
          />
          <path
            d="M256 60L88 140v128c0 94 72 180 168 200 96-20 168-106 168-200V140L256 60z"
            fill="#060a13"
          />
          <ellipse
            cx="256"
            cy="256"
            rx="120"
            ry="80"
            stroke="#ef4444"
            strokeWidth="6"
          />
          <circle cx="256" cy="256" r="48" stroke="#ef4444" strokeWidth="5" />
          <circle cx="256" cy="256" r="20" fill="#ef4444" />
          <circle cx="248" cy="248" r="6" fill="#ff6b7a" opacity="0.8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
