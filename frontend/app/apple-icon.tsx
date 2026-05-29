import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="140"
          height="140"
        >
          <path
            d="M16 2C10.477 2 6 6.477 6 12C6 18.5 16 30 16 30C16 30 26 18.5 26 12C26 6.477 21.523 2 16 2Z"
            fill="#FFCB2D"
          />
          <circle cx="16" cy="12" r="5" fill="#16161a" />
          <path
            d="M13 12l2 2 4-3.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
