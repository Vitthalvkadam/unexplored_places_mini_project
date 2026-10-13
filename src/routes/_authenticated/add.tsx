import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LazyMap } from "@/components/LazyMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useGeolocation, usePlaces } from "@/lib/hooks";
import { CATEGORIES, distanceMeters, friendlyError, SAME_PLACE_RADIUS_M, uploadPhoto } from "@/lib/places";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({
    meta: [
      { title: "Share a discovery — HiddenTrail" },
      { name: "description", content: "Upload a hidden place with a photo and exact GPS location." },
      { property: "og:title", content: "Share a discovery — HiddenTrail" },
      { property: "og:description", content: "Upload a hidden place with a photo and exact GPS location." },
    ],
  }),
  component: AddPlace,
});

function AddPlace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const geo = useGeolocation();
  const { data: places = [] } = usePlaces();
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("waterfall");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const loc = picked ?? geo.pos;
  const nearby = useMemo(
    () =>
      loc
        ? places.find((p) => distanceMeters({ lat: loc[0], lng: loc[1] }, { lat: p.latitude, lng: p.longitude }) <= SAME_PLACE_RADIUS_M)
        : undefined,
    [loc?.[0], loc?.[1], places],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !loc || !file) return toast.error("Choose a location and photo first.");
    setBusy(true);
    let placeId: string | null = null;
    let path: string | null = null;
    try {
      path = await uploadPhoto(user.id, file);
      const { data, error } = await supabase
        .from("places")
        .insert({ name, category, description, latitude: loc[0], longitude: loc[1], created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;
      placeId = data.id;
      const { error: cErr } = await supabase.from("contributions").insert({ place_id: placeId, user_id: user.id, photo_url: path });
      if (cErr) throw cErr;
      toast.success("Discovery shared!");
      qc.invalidateQueries({ queryKey: ["places"] });
      navigate({ to: "/places/$id", params: { id: placeId } });
    } catch (err) {
      if (placeId) await supabase.from("places").delete().eq("id", placeId);
      if (path) await supabase.storage.from("place-photos").remove([path]);
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold">Share a discovery</h1>
        <p className="mt-2 text-muted-foreground">Tap the map to set the exact spot, or use your current GPS location.</p>
        <div className="mt-5 h-[380px] overflow-hidden rounded-2xl border shadow-soft">
          <LazyMap center={loc ?? [20.5937, 78.9629]} zoom={loc ? 14 : 5} userPos={geo.pos} picked={picked} onPick={(lat, lng) => setPicked([lat, lng])} />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{loc ? `${loc[0].toFixed(5)}, ${loc[1].toFixed(5)}` : geo.error ?? "Waiting for location…"}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPicked(null);
              geo.request();
            }}
          >
            <LocateFixed className="h-4 w-4" /> Use my location
          </Button>
        </div>
      </div>
      <div className="lg:pt-14">
        {nearby ? (
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-2xl font-semibold">Already discovered</h2>
            <p className="mt-2 text-muted-foreground">
              <strong>{nearby.name}</strong> is within {SAME_PLACE_RADIUS_M} m of this spot. Add your photo there instead — up to five travelers can contribute to each place.
            </p>
            <Button asChild className="mt-4 rounded-full">
              <Link to="/places/$id" params={{ id: nearby.id }}>Open {nearby.name}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Place name</Label>
              <Input id="name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat">Type</Label>
              <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" required minLength={10} maxLength={3000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How to get there, best season, what makes it special…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Your photo</Label>
              <Input id="photo" type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit" className="h-11 w-full rounded-full" disabled={busy || !loc}>
              {busy ? "Sharing…" : "Share discovery"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
