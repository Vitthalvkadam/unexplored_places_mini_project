import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  { value: "waterfall", label: "Waterfall" },
  { value: "lake", label: "Lake" },
  { value: "viewpoint", label: "Viewpoint" },
  { value: "trail", label: "Trekking trail" },
  { value: "cave", label: "Cave" },
  { value: "scenic", label: "Scenic spot" },
  { value: "attraction", label: "Local attraction" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const MAX_CONTRIBUTORS = 5;
export const SAME_PLACE_RADIUS_M = 75;

export type Contribution = {
  id: string;
  place_id: string;
  user_id: string;
  photo_url: string;
  note: string | null;
  created_at: string;
};
export type Place = {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  created_by: string;
  created_at: string;
  contributions: Contribution[];
};

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const contributorCount = (p: Pick<Place, "contributions">) =>
  new Set(p.contributions.map((c) => c.user_id)).size;

export function canContribute(p: Pick<Place, "contributions">, userId: string) {
  const ids = new Set(p.contributions.map((c) => c.user_id));
  return ids.has(userId) || ids.size < MAX_CONTRIBUTORS;
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select("*, contributions(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Place[];
}

export async function fetchPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase.from("places").select("*, contributions(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Place | null;
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from("place-photos").createSignedUrls(unique, 3600);
  if (error) throw error;
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

export async function uploadPhoto(userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("place-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("CONTRIBUTOR_LIMIT")) return "This place already has 5 contributors — it's full.";
  return msg;
}
