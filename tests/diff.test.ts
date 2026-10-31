import { describe, expect, it } from "vitest";

import { diff, hasBreaking } from "../src/diff";
import type { Dependency } from "../src/types";

const dep = (name: string, version: string, dev = false): Dependency => ({ name, version, dev });

describe("diff", () => {
  it("spots an addition", () => {
    const changes = diff([], [dep("a", "1.0.0")]);
    expect(changes).toEqual([{ kind: "added", name: "a", version: "1.0.0", dev: false }]);
  });

  it("spots a removal", () => {
    const changes = diff([dep("a", "1.0.0")], []);
    expect(changes).toEqual([{ kind: "removed", name: "a", version: "1.0.0", dev: false }]);
  });

  it("spots an update and names the bump", () => {
    const changes = diff([dep("a", "1.0.0")], [dep("a", "2.0.0")]);
    expect(changes[0]).toMatchObject({ kind: "updated", bump: "major", downgrade: false });
  });

  it("flags a downgrade", () => {
    const changes = diff([dep("a", "2.0.0")], [dep("a", "1.9.0")]);
    expect(changes[0]).toMatchObject({ kind: "updated", downgrade: true });
  });

  it("reports nothing when the versions match", () => {
    expect(diff([dep("a", "1.0.0")], [dep("a", "1.0.0")])).toEqual([]);
  });

  it("puts what matters first", () => {
    const before = [dep("down", "2.0.0"), dep("major", "1.0.0"), dep("patch", "1.0.0")];
    const after = [
      dep("down", "1.0.0"),
      dep("major", "2.0.0"),
      dep("patch", "1.0.1"),
      dep("new", "1.0.0"),
    ];

    expect(diff(before, after).map((c) => c.name)).toEqual(["down", "major", "patch", "new"]);
  });

  it("carries the dev flag through", () => {
    const changes = diff([], [dep("vitest", "2.0.0", true)]);
    expect(changes[0]?.dev).toBe(true);
  });
});

describe("hasBreaking", () => {
  it("is true for a major bump", () => {
    expect(hasBreaking(diff([dep("a", "1.0.0")], [dep("a", "2.0.0")]))).toBe(true);
  });

  it("is true for a downgrade", () => {
    expect(hasBreaking(diff([dep("a", "2.0.0")], [dep("a", "1.0.0")]))).toBe(true);
  });

  it("is false for additions and patches alone", () => {
    const changes = diff([dep("a", "1.0.0")], [dep("a", "1.0.1"), dep("b", "1.0.0")]);
    expect(hasBreaking(changes)).toBe(false);
  });
});
