import { describe, expect, it } from "vitest";

import { detect, parseNpm, parsePip, parseYarn } from "../src/parsers";

describe("detect", () => {
  it("recognises lockfiles by name", () => {
    expect(detect("package-lock.json")).toBe("npm");
    expect(detect("app/yarn.lock")).toBe("yarn");
    expect(detect("requirements.txt")).toBe("pip");
    expect(detect("requirements-dev.txt")).toBe("pip");
  });

  it("ignores everything else", () => {
    expect(detect("src/index.ts")).toBeNull();
    expect(detect("notes.txt")).toBeNull();
  });
});

describe("parseNpm", () => {
  it("reads the modern packages map", () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "app" },
        "node_modules/left-pad": { version: "1.3.0" },
        "node_modules/vitest": { version: "2.1.8", dev: true },
      },
    });

    expect(parseNpm(lock)).toEqual([
      { name: "left-pad", version: "1.3.0", dev: false },
      { name: "vitest", version: "2.1.8", dev: true },
    ]);
  });

  it("keeps scoped names intact", () => {
    const lock = JSON.stringify({
      packages: { "node_modules/@actions/core": { version: "1.11.1" } },
    });
    expect(parseNpm(lock)[0]?.name).toBe("@actions/core");
  });

  it("unwraps nested node_modules paths", () => {
    const lock = JSON.stringify({
      packages: { "node_modules/a/node_modules/b": { version: "2.0.0" } },
    });
    expect(parseNpm(lock)[0]?.name).toBe("b");
  });

  it("falls back to the v1 dependency tree", () => {
    const lock = JSON.stringify({
      lockfileVersion: 1,
      dependencies: {
        chalk: { version: "4.1.2", dependencies: { "ansi-styles": { version: "4.3.0" } } },
      },
    });

    expect(parseNpm(lock).map((d) => d.name)).toEqual(["ansi-styles", "chalk"]);
  });

  it("rejects invalid JSON with a clear message", () => {
    expect(() => parseNpm("{ not json")).toThrow(/not valid JSON/);
  });
});

describe("parseYarn", () => {
  it("reads a classic lockfile", () => {
    const lock = [
      "# yarn lockfile v1",
      "",
      '"@babel/core@^7.0.0":',
      '  version "7.26.0"',
      "",
      "left-pad@^1.3.0:",
      '  version "1.3.0"',
      "",
    ].join("\n");

    expect(parseYarn(lock)).toEqual([
      { name: "@babel/core", version: "7.26.0" },
      { name: "left-pad", version: "1.3.0" },
    ]);
  });

  it("handles several descriptors sharing one version", () => {
    const lock = ['"pkg@^1.0.0", "pkg@^1.2.0":', '  version "1.2.3"'].join("\n");
    expect(parseYarn(lock)).toEqual([{ name: "pkg", version: "1.2.3" }]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseYarn("")).toEqual([]);
  });
});

describe("parsePip", () => {
  it("reads exact pins", () => {
    const text = ["requests==2.32.3", "PyYAML==6.0.2", ""].join("\n");
    expect(parsePip(text)).toEqual([
      { name: "pyyaml", version: "6.0.2" },
      { name: "requests", version: "2.32.3" },
    ]);
  });

  it("normalises names the way PyPI does", () => {
    expect(parsePip("Flask_SQLAlchemy==3.1.1")[0]?.name).toBe("flask-sqlalchemy");
  });

  it("strips extras, markers and comments", () => {
    const text = [
      "uvicorn[standard]==0.32.1",
      'httpx==0.28.0 ; python_version >= "3.9"',
      "black==24.10.0  # formatter",
    ].join("\n");

    expect(parsePip(text).map((d) => `${d.name}@${d.version}`)).toEqual([
      "black@24.10.0",
      "httpx@0.28.0",
      "uvicorn@0.32.1",
    ]);
  });

  it("skips anything that is not an exact pin", () => {
    const text = ["django>=4.0", "-r base.txt", "-e .", "# comment", ""].join("\n");
    expect(parsePip(text)).toEqual([]);
  });
});
