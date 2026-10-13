import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Navigation, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LazyMap } from "@/components/LazyMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useFavorites, usePhotoUrls } from "@/lib/hooks";
import {
  canContribute,
  categoryLabel,
  contributorCount,
  directionsUrl,
  fetchPlace,
  friendlyError,
  MAX_CONTRIBUTORS,
  uploadPhoto,
} from "@/lib/places";

export const Route = createFileRoute("/_authenticated/places/$id")({
  head: () => ({
    meta: [
      { title: "Hidden place — HiddenTrail" },
      { name: "description", content: "Photos, description and directions for a hidden place." },
      { property: "og:title", content: "Hidden place — HiddenTrail" },
      { property: "og:description", content: "Photos, description and directions for a hidden place." },
    ],
  }),
  component: PlaceDetail,
});

function PlaceDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: place, isLoading } = useQuery({ queryKey: ["place", id], queryFn: () => fetchPlace(id) });
  const { data: urls = {} } = usePhotoUrls(place?.contributions.map((c) => c.photo_url) ?? []);
  const { data: favs } = useFavorites(user?.id);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!place)
    return (
      <div className="p-8">
        <p>Place not found.</p>
        <Link to="/explore" className="text-primary underline">Back to explore</Link>
      </div>
    );

  const isFav = favs?.has(place.id);
  const allowed = user && canContribute(place, user.id);

  async function toggleFav() {
    if (!user) return;
    const { error } = isFav
      ? await supabase.from("favorites").delete().eq("place_id", place!.id).eq("user_id", user.id)
      : await supabase.from("favorites").insert({ place_id: place!.id, user_id: user.id });
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["favorites"] });
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    try {
      const path = await uploadPhoto(user.id, file);
      const { error } = await supabase.from("contributions").insert({ place_id: place!.id, user_id: user.id, photo_url: path, note: note || null });
      if (error) {
        await supabase.storage.from("place-photos").remove([path]);
        throw error;
      }
      toast.success("Photo added!");
      setFile(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["place", id] });
      qc.invalidateQueries({ queryKey: ["places"] });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const [cover, ...rest] = place.contributions;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl bg-muted">
        {cover && urls[cover.photo_url] && <img src={urls[cover.photo_url]} alt={place.name} className="max-h-[520px] w-full object-cover" />}
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">{categoryLabel(place.category)}</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{place.name}</h1>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/85">{place.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <a href={directionsUrl(place.latitude, place.longitude)} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Get directions
              </a>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={toggleFav}>
              <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} /> {isFav ? "Saved" : "Save"}
            </Button>
          </div>
          {rest.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-semibold">More photos</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {rest.map((c) => (
                  <figure key={c.id} className="overflow-hidden rounded-xl bg-muted">
                    {urls[c.photo_url] && <img src={urls[c.photo_url]} alt={c.note ?? place.name} loading="lazy" className="aspect-square w-full object-cover" />}
                    {c.note && <figcaption className="p-2 text-xs text-muted-foreground">{c.note}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="space-y-5">
          <div className="h-64 overflow-hidden rounded-2xl border">
            <LazyMap center={[place.latitude, place.longitude]} zoom={13} places={[place]} />
          </div>
          <p className="text-sm text-muted-foreground">
            GPS: {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </p>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" /> {contributorCount(place)} of {MAX_CONTRIBUTORS} contributors
            </div>
            {allowed ? (
              <form onSubmit={contribute} className="mt-4 space-y-3">
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                <Input placeholder="Short note (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" className="w-full rounded-full" disabled={busy || !file}>
                  <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Add your photo"}
                </Button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">This place is full — it already has five contributors.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
