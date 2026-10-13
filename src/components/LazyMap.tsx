import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";
import type MapViewType from "./MapView";

const MapView = lazy(() => import("./MapView"));

export function LazyMap(props: ComponentProps<typeof MapViewType>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fallback = <div className="h-full w-full animate-pulse bg-muted" />;
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <MapView {...props} />
    </Suspense>
  );
}
