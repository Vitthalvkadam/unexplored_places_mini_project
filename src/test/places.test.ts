import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canContribute, distanceMeters } from "@/lib/places";

const mk = (ids: string[]) => ({ contributions: ids.map((user_id) => ({ user_id })) as never });

describe("contributor limit", () => {
  it("allows a new contributor when 4 exist", () => {
    expect(canContribute(mk(["a", "b", "c", "d"]), "e")).toBe(true);
  });
  it("blocks a 6th distinct contributor", () => {
    expect(canContribute(mk(["a", "b", "c", "d", "e"]), "f")).toBe(false);
  });
  it("lets an existing contributor add more photos when full", () => {
    expect(canContribute(mk(["a", "b", "c", "d", "e", "a"]), "a")).toBe(true);
  });
});

describe("distance", () => {
  it("measures ~111 km per degree of latitude", () => {
    expect(Math.round(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000)).toBe(111);
  });
});
