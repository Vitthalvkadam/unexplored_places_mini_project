import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Compass, Heart, Users } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HiddenTrail — Discover places others haven't found" },
      { name: "description", content: "Find lesser-known waterfalls, lakes, caves and trails shared by real travelers, with GPS and directions." },
      { property: "og:title", content: "HiddenTrail — Discover places others haven't found" },
      { property: "og:description", content: "Find lesser-known waterfalls, lakes, caves and trails shared by real travelers." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const features = [
    { icon: Compass, title: "Explore nearby", text: "See real discoveries around you on a live map." },
    { icon: Camera, title: "Share with GPS", text: "Upload your own photo pinned to exact coordinates." },
    { icon: Users, title: "Max 5 contributors", text: "Each spot stays rare — only five people can claim it." },
    { icon: Heart, title: "Save favorites", text: "Build your personal list of places to go next." },
  ];
  return (
    <main>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Hidden waterfall in a forest" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-forest opacity-75" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-32 text-forest-foreground">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Off the beaten path</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] md:text-7xl">Discover places others haven't found.</h1>
          <p className="mt-6 max-w-xl text-lg opacity-90">
            Waterfalls, quiet lakes, caves and viewpoints — shared by travelers who actually stood there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full">
              <Link to={user ? "/explore" : "/auth"}>{user ? "Start exploring" : "Join HiddenTrail"}</Link>
            </Button>
            {user && (
              <Button asChild size="lg" variant="outline" className="rounded-full border-forest-foreground/40 bg-transparent text-forest-foreground hover:bg-forest-foreground/10 hover:text-forest-foreground">
                <Link to="/add">Share a discovery</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
