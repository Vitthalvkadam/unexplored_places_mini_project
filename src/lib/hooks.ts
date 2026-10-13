import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchPlaces, signedUrls } from "@/lib/places";
import { supabase } from "@/integrations/supabase/client";

export const usePlaces = () => useQuery({ queryKey: ["places"], queryFn: fetchPlaces });

export const usePhotoUrls = (paths: string[]) =>
  useQuery({
    queryKey: ["photos", [...paths].sort()],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
  });

export const useFavorites = (userId: string | undefined) =>
  useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("place_id");
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.place_id));
    },
  });

export function useGeolocation() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = () => {
    if (!navigator.geolocation) return void setError("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        setError(null);
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  useEffect(() => request(), []);
  return { pos, error, request };
}
