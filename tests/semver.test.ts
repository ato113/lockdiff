import { describe, expect, it } from "vitest";

import { classify, compare, parse } from "../src/semver";

describe("parse", () => {
  it("reads plain versions", () => {
    expect(parse("1.2.3")?.parts).toEqual([1, 2, 3]);
  });

  it("tolerates a leading v", () => {
    expect(parse("v2.0.0")?.parts).toEqual([2, 0, 0]);
  });

  it("separates a pre-release suffix", () => {
    expect(parse("1.0.0-rc.1")?.prerelease).toBe("rc.1");
  });

  it("returns null for things that are not versions", () => {
    expect(parse("github:user/repo#branch")).toBeNull();
    expect(parse("")).toBeNull();
  });
});

describe("compare", () => {
  it("orders by each numeric part", () => {
    expect(compare("1.2.3", "1.2.4")).toBe(-1);
    expect(compare("2.0.0", "1.9.9")).toBe(1);
    expect(compare("1.0.0", "1.0.0")).toBe(0);
  });

  it("treats missing parts as zero", () => {
    expect(compare("1.2", "1.2.0")).toBe(0);
    expect(compare("1.2", "1.2.1")).toBe(-1);
  });

  it("ranks a release above its pre-release", () => {
    expect(compare("1.0.0", "1.0.0-rc1")).toBe(1);
    expect(compare("1.0.0-rc1", "1.0.0")).toBe(-1);
  });

  it("does not crash on unparseable versions", () => {
    expect(compare("git+ssh://x", "git+ssh://x")).toBe(0);
  });
});

describe("classify", () => {
  it("names the size of a bump", () => {
    expect(classify("1.0.0", "2.0.0")).toBe("major");
    expect(classify("1.0.0", "1.1.0")).toBe("minor");
    expect(classify("1.0.0", "1.0.1")).toBe("patch");
  });

  it("treats a 0.x minor bump as breaking", () => {
    // 0.x releases break things on minor bumps, so reviewers should see them.
    expect(classify("0.1.0", "0.2.0")).toBe("major");
    expect(classify("0.1.0", "0.1.1")).toBe("patch");
  });

  it("falls back to other when it cannot tell", () => {
    expect(classify("1.0.0", "file:../local")).toBe("other");
  });
});
