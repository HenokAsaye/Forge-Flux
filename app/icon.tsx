import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #020617 0%, #0f172a 100%)",
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.28)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: "9999px",
            filter: "blur(14px)",
            opacity: 0.45,
            background: "#10b981",
          }}
        />
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: "-0.05em",
            zIndex: 1,
            textShadow: "0 0 12px rgba(16,185,129,0.5)",
          }}
        >
          F
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
