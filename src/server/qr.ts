import "server-only";
import QRCode from "qrcode";

export const QR_COLORS: Record<string, string> = {
  navy: "#101C35",
  black: "#111111",
  champagne: "#8C6A2E",
  burgundy: "#5A1F30",
  forest: "#2F5D46",
};

/** QR code as SVG or PNG. High error correction so it scans when printed small or slightly damaged. */
export async function renderQr(text: string, { format, color = "navy", size = 1024 }: { format: "svg" | "png"; color?: string; size?: number }) {
  const dark = QR_COLORS[color] ?? QR_COLORS.navy;
  const options = { errorCorrectionLevel: "H" as const, margin: 2, color: { dark, light: "#FFFFFF" } };
  if (format === "svg") return { body: await QRCode.toString(text, { ...options, type: "svg" }), type: "image/svg+xml" };
  return { body: new Uint8Array(await QRCode.toBuffer(text, { ...options, width: Math.min(Math.max(size, 256), 2048) })), type: "image/png" };
}
