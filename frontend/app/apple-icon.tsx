import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const iconPath = path.join(process.cwd(), "public", "icon.png");
  const iconData = await readFile(iconPath);
  const dataUrl = `data:image/png;base64,${iconData.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={dataUrl} width="512" height="512" />
      </div>
    ),
    { ...size }
  );
}
