/**
 * Geocoding server-side con Nominatim (OpenStreetMap). Sin API key.
 * Uso: cache en DB (lat, lng, geocoded_at, geocode_query).
 */

export type GeocodeResult = { lat: number; lng: number } | null;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Cafecitos/1.0 (contacto@cafecitos.uy)";

export async function geocodeAddress(addressText: string): Promise<GeocodeResult> {
  const trimmed = (addressText ?? "").trim();
  if (!trimmed) return null;

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon ?? first?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
