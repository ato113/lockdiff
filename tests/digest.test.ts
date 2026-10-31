import { describe, expect, it } from "vitest";

import { build } from "../src/digest";

const npmLock = (packages: Record<string, { version: string; dev?: boolean }>): string =>
  JSON.stringify({
    lockfileVersion: 3,
    packages: Object.fromEntries(
      Object.entries(packages).map(([name, entry]) => [`node_modules/${name}`, entry]),
    ),
  });

describe("build", () => {
  it("compares a lockfile against its base", async () => {
    const digest = await build({
      base: "main",
      paths: ["package-lock.json"],
      readBase: async () => npmLock({ react: { version: "18.0.0" } }),
      readHead: async () => npmLock({ react: { version: "19.0.0" } }),
    });

    expect(digest.files).toHaveLength(1);
    expect(digest.files[0]?.changes[0]).toMatchObject({ name: "react", bump: "major" });
  });

  it("treats a lockfile missing from the base as all additions", async () => {
    const digest = await build({
      base: "main",
      paths: ["package-lock.json"],
      readBase: async () => null,
      readHead: async () => npmLock({ react: { version: "19.0.0" } }),
    });

    expect(digest.files[0]?.changes).toEqual([
      { kind: "added", name: "react", version: "19.0.0", dev: false },
    ]);
  });

  it("skips a lockfile that is gone from the head", async () => {
    const digest = await build({
      base: "main",
      paths: ["package-lock.json"],
      readBase: async () => npmLock({ react: { version: "18.0.0" } }),
      readHead: async () => null,
    });

    expect(digest.files).toEqual([]);
  });

  it("ignores paths that are not lockfiles", async () => {
    const digest = await build({
      base: "main",
      paths: ["src/index.ts", "README.md"],
      readBase: async () => "",
      readHead: async () => "",
    });

    expect(digest.files).toEqual([]);
  });

  it("handles several lockfiles at once", async () => {
    const digest = await build({
      base: "main",
      paths: ["package-lock.json", "requirements.txt"],
      readBase: async (_ref, path) =>
        path === "package-lock.json" ? npmLock({ react: { version: "18.0.0" } }) : "requests==2.31.0",
      readHead: async (path) =>
        path === "package-lock.json" ? npmLock({ react: { version: "18.0.1" } }) : "requests==2.32.3",
    });

    expect(digest.files.map((f) => f.ecosystem)).toEqual(["npm", "pip"]);
    expect(digest.files.every((f) => f.changes.length === 1)).toBe(true);
  });
});
