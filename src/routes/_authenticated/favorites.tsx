import { createFileRoute, Link } from "@tanstack/react-router";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useFavorites, usePhotoUrls, usePlaces } from "@/lib/hooks";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Saved places — HiddenTrail" },
      { name: "description", content: "Your saved hidden places." },
      { property: "og:title", content: "Saved places — HiddenTrail" },
      { property: "og:description", content: "Your saved hidden places." },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const { user } = useAuth();
  const { data: places = [] } = usePlaces();
  const { data: favs } = useFavorites(user?.id);
  const saved = places.filter((p) => favs?.has(p.id));
  const { data: urls = {} } = usePhotoUrls(saved.map((p) => p.contributions[0]?.photo_url).filter((x): x is string => !!x));
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Saved places</h1>
      {saved.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">You haven't saved anything yet.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/explore">Explore places</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((p) => (
            <PlaceCard key={p.id} place={p} photo={urls[p.contributions[0]?.photo_url ?? ""]} />
          ))}
        </div>
      )}
    </main>
  );
}
