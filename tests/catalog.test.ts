import { describe, expect, it } from "vitest";
import { CATALOG, CATALOG_BY_SLUG } from "@/lib/catalog";
import { EXERCISE_FIGURE } from "@/lib/figure/templates";

describe("exercise catalog", () => {
  it("has unique slugs", () => expect(CATALOG_BY_SLUG.size).toBe(CATALOG.length));
  it("only references substitutions that exist", () => {
    for (const e of CATALOG) for (const s of e.substitutions) expect(CATALOG_BY_SLUG.has(s), `${e.slug} → ${s}`).toBe(true);
  });
  it("gives every high-risk lift at least one safer substitution", () => {
    for (const e of CATALOG.filter((x) => x.highRisk)) expect(e.substitutions.some((s) => !CATALOG_BY_SLUG.get(s)!.highRisk)).toBe(true);
  });
  it("has written instructions for every exercise (text alternative to the illustration)", () => {
    for (const e of CATALOG) expect(e.instructions.length).toBeGreaterThan(0);
  });
  it("has a form illustration for every exercise, and none for exercises that don't exist", () => {
    for (const e of CATALOG) expect(EXERCISE_FIGURE[e.slug], e.slug).toBeDefined();
    for (const slug of Object.keys(EXERCISE_FIGURE)) expect(CATALOG_BY_SLUG.has(slug), slug).toBe(true);
  });
});
