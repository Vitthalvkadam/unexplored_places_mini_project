import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";
import { LazyMap } from "@/components/LazyMap";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeolocation, usePhotoUrls, usePlaces } from "@/lib/hooks";
import { CATEGORIES, distanceMeters } from "@/lib/places";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore — HiddenTrail" },
      { name: "description", content: "Browse hidden places near you on an interactive map." },
      { property: "og:title", content: "Explore — HiddenTrail" },
      { property: "og:description", content: "Browse hidden places near you on an interactive map." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const navigate = useNavigate();
  const { data: places = [], isLoading } = usePlaces();
  const geo = useGeolocation();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<[number, number] | null>(null);

  const origin = center ?? geo.pos;
  const list = useMemo(() => {
    const filtered = places.filter((p) => category === "all" || p.category === category);
    const withDist = filtered.map((p) => ({
      p,
      d: origin ? distanceMeters({ lat: origin[0], lng: origin[1] }, { lat: p.latitude, lng: p.longitude }) : undefined,
    }));
    if (origin) withDist.sort((a, b) => a.d! - b.d!);
    return withDist;
  }, [places, category, origin?.[0], origin?.[1]]);

  const covers = list.map(({ p }) => p.contributions[0]?.photo_url).filter(Boolean) as string[];
  const { data: urls = {} } = usePhotoUrls(covers);

  async function searchLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data[0]) return toast.error("Location not found");
    setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
  }

  const mapCenter: [number, number] = origin ?? (places[0] ? [places[0].latitude, places[0].longitude] : [20.5937, 78.9629]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-semibold">Explore</h1>
        <form onSubmit={searchLocation} className="flex gap-2">
          <Input placeholder="Search a town or region…" value={query} onChange={(e) => setQuery(e.target.value)} className="md:w-72" />
          <Button type="submit" size="icon" variant="secondary" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Use my location"
            onClick={() => {
              setCenter(null);
              geo.request();
            }}
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        </form>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-3 py-1 text-sm ${category === c.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-5 h-[420px] overflow-hidden rounded-2xl border shadow-soft">
        <LazyMap
          center={mapCenter}
          zoom={origin ? 11 : 5}
          places={list.map((x) => x.p)}
          userPos={geo.pos}
          onSelect={(id) => navigate({ to: "/places/$id", params: { id } })}
        />
      </div>
      <section className="mt-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading discoveries…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h2 className="text-2xl font-semibold">No discoveries yet</h2>
            <p className="mt-2 text-muted-foreground">Be the first to share a hidden place.</p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/add">Add a place</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ p, d }) => (
              <PlaceCard key={p.id} place={p} distance={d} photo={urls[p.contributions[0]?.photo_url]} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
