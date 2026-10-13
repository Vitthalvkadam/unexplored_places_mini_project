import { Link } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";
import { categoryLabel, contributorCount, formatDistance, MAX_CONTRIBUTORS, type Place } from "@/lib/places";

export function PlaceCard({ place, photo, distance }: { place: Place; photo?: string | undefined; distance?: number | undefined }) {
  return (
    <Link
      to="/places/$id"
      params={{ id: place.id }}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-0.5"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {photo && (
          <img src={photo} alt={place.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-clay">
          <span>{categoryLabel(place.category)}</span>
          {distance !== undefined && <span className="text-muted-foreground">{formatDistance(distance)}</span>}
        </div>
        <h3 className="text-lg font-semibold leading-tight">{place.name}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {contributorCount(place)}/{MAX_CONTRIBUTORS}
          </span>
        </div>
      </div>
    </Link>
  );
}
