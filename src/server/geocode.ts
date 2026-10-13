import "server-only";
import { appUrl, env } from "@/lib/env";

/** Venue coordinates from OpenStreetMap Nominatim. Returns null on any failure; the couple can pin manually. */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim() || env.GEOCODER === "off") return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      // Nominatim's usage policy requires an identifying User-Agent.
      headers: { "User-Agent": `EverMore wedding websites (${appUrl()})`, "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const [first] = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
