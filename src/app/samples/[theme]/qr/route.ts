import { appUrl } from "@/lib/env";
import { THEMES } from "@/lib/themes";
import { renderQr } from "@/server/qr";

export function generateStaticParams() {
  return THEMES.map((t) => ({ theme: t.id }));
}

/** QR for a sample page: points at the sample itself. */
export async function GET(_request: Request, { params }: RouteContext<"/samples/[theme]/qr">) {
  const { theme } = await params;
  if (!THEMES.some((t) => t.id === theme)) return new Response("Not found", { status: 404 });
  const qr = await renderQr(appUrl(`/samples/${theme}`), { format: "svg" });
  return new Response(qr.body, { headers: { "Content-Type": qr.type, "Cache-Control": "public, max-age=86400" } });
}
