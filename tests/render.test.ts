import { describe, expect, it } from "vitest";

import { MARKER, render, summarize } from "../src/render";
import type { Digest } from "../src/types";

const digest = (changes: Digest["files"][number]["changes"]): Digest => ({
  files: [{ path: "package-lock.json", ecosystem: "npm", changes }],
});

describe("render", () => {
  it("always carries the marker so the comment can be found again", () => {
    expect(render({ files: [] })).toContain(MARKER);
  });

  it("says so plainly when nothing changed", () => {
    expect(render({ files: [] })).toContain("No dependency changes");
  });

  it("pulls major bumps out of the collapsed section", () => {
    const body = render(
      digest([
        { kind: "updated", name: "react", from: "18.0.0", to: "19.0.0", bump: "major", downgrade: false, dev: false },
        { kind: "added", name: "clsx", version: "2.1.1", dev: false },
      ]),
    );

    const attention = body.indexOf("Worth a look");
    const details = body.indexOf("<details>");
    expect(attention).toBeGreaterThan(-1);
    expect(attention).toBeLessThan(details);
    expect(body).toContain("`react` 18.0.0 → 19.0.0 — **major**");
  });

  it("labels a downgrade as such", () => {
    const body = render(
      digest([
        { kind: "updated", name: "a", from: "2.0.0", to: "1.0.0", bump: "major", downgrade: true, dev: false },
      ]),
    );
    expect(body).toContain("**downgrade**");
  });

  it("collapses routine changes", () => {
    const body = render(digest([{ kind: "added", name: "a", version: "1.0.0", dev: false }]));
    expect(body).toContain("<details>");
    expect(body).toContain("1 other change");
  });

  it("marks dev dependencies", () => {
    const body = render(digest([{ kind: "added", name: "vitest", version: "2.0.0", dev: true }]));
    expect(body).toContain("_(dev)_");
  });
});

describe("summarize", () => {
  it("counts the changes", () => {
    const text = summarize(
      digest([
        { kind: "added", name: "a", version: "1.0.0", dev: false },
        { kind: "removed", name: "b", version: "1.0.0", dev: false },
      ]),
    );
    expect(text).toBe("2 dependency changes.");
  });

  it("uses the singular for one change", () => {
    expect(summarize(digest([{ kind: "added", name: "a", version: "1.0.0", dev: false }]))).toBe(
      "1 dependency change.",
    );
  });

  it("calls out major bumps", () => {
    const text = summarize(
      digest([
        { kind: "updated", name: "a", from: "1.0.0", to: "2.0.0", bump: "major", downgrade: false, dev: false },
      ]),
    );
    expect(text).toContain("including major bumps");
  });
});
