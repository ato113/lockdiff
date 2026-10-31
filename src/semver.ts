import type { Bump } from "./types";

/** A version split into its numeric parts, ignoring any pre-release suffix. */
interface Parsed {
  parts: number[];
  prerelease: string | null;
}

/**
 * Parse a version string loosely.
 *
 * Lockfiles hold versions from several ecosystems, so this accepts leading
 * "v", any number of numeric parts, and a pre-release or build suffix. It
 * returns null for anything it cannot read as a version — a git URL, say —
 * and callers fall back to "other".
 */
export function parse(version: string): Parsed | null {
  const cleaned = version.trim().replace(/^v/i, "");
  const match = /^(\d+(?:\.\d+)*)(?:[-+](.+))?$/.exec(cleaned);
  if (!match || !match[1]) return null;

  const parts = match[1].split(".").map((part) => Number.parseInt(part, 10));
  if (parts.some(Number.isNaN)) return null;

  return { parts, prerelease: match[2] ?? null };
}

function at(parts: number[], index: number): number {
  return parts[index] ?? 0;
}

/** Compare two versions: -1 when a < b, 1 when a > b, 0 when equal. */
export function compare(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return a === b ? 0 : a < b ? -1 : 1;

  const length = Math.max(left.parts.length, right.parts.length);
  for (let i = 0; i < length; i++) {
    const difference = at(left.parts, i) - at(right.parts, i);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }

  // A release outranks a pre-release of the same numbers (1.0.0 > 1.0.0-rc1).
  if (left.prerelease && !right.prerelease) return -1;
  if (!left.prerelease && right.prerelease) return 1;
  if (left.prerelease && right.prerelease) {
    if (left.prerelease === right.prerelease) return 0;
    return left.prerelease < right.prerelease ? -1 : 1;
  }
  return 0;
}

/**
 * Classify the size of a version change.
 *
 * Versions below 1.0.0 are treated the way the ecosystem actually treats them:
 * a 0.x -> 0.y change is breaking in practice, so it counts as major.
 */
export function classify(from: string, to: string): Bump {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return "other";

  if (at(a.parts, 0) !== at(b.parts, 0)) return "major";
  if (at(a.parts, 0) === 0 && at(a.parts, 1) !== at(b.parts, 1)) return "major";
  if (at(a.parts, 1) !== at(b.parts, 1)) return "minor";
  if (at(a.parts, 2) !== at(b.parts, 2)) return "patch";
  return "other";
}
