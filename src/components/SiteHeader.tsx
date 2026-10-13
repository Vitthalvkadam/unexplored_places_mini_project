import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, Heart, LogOut, Mountain, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const link = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground";
  const active = { className: "bg-secondary text-foreground" };
  return (
    <header className="sticky top-0 z-[1000] border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-semibold">HiddenTrail</span>
        </Link>
        {user ? (
          <nav className="flex items-center gap-1">
            <Link to="/explore" className={link} activeProps={active}>
              <Compass className="h-4 w-4" /> <span className="hidden sm:inline">Explore</span>
            </Link>
            <Link to="/favorites" className={link} activeProps={active}>
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Saved</span>
            </Link>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/add">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add place</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        ) : (
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
