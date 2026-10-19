import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon da aba: marca LG (lima sobre navy), no lugar do ícone padrão da Vercel. */
export default function Icon(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f1e",
        color: "#b8f000",
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: "-0.04em",
      }}
    >
      LG
    </div>,
    { ...size },
  );
}
