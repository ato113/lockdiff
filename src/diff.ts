import { classify, compare } from "./semver";
import type { Change, Dependency } from "./types";

const ORDER = { major: 0, minor: 1, patch: 2, other: 3 } as const;

/**
 * Compare two sets of dependencies.
 *
 * Changes come back ordered by how much they deserve a reviewer's attention:
 * downgrades first (they are nearly always a mistake), then major bumps, then
 * everything else.
 */
export function diff(before: Dependency[], after: Dependency[]): Change[] {
  const previous = new Map(before.map((d) => [d.name, d]));
  const current = new Map(after.map((d) => [d.name, d]));
  const changes: Change[] = [];

  for (const [name, entry] of current) {
    const was = previous.get(name);
    if (!was) {
      changes.push({ kind: "added", name, version: entry.version, dev: Boolean(entry.dev) });
      continue;
    }
    if (was.version !== entry.version) {
      changes.push({
        kind: "updated",
        name,
        from: was.version,
        to: entry.version,
        bump: classify(was.version, entry.version),
        downgrade: compare(entry.version, was.version) < 0,
        dev: Boolean(entry.dev),
      });
    }
  }

  for (const [name, entry] of previous) {
    if (!current.has(name)) {
      changes.push({ kind: "removed", name, version: entry.version, dev: Boolean(entry.dev) });
    }
  }

  return changes.sort(byAttention);
}

function weight(change: Change): number {
  if (change.kind === "updated") {
    if (change.downgrade) return 0;
    return 1 + ORDER[change.bump];
  }
  if (change.kind === "added") return 6;
  return 7;
}

function byAttention(a: Change, b: Change): number {
  const difference = weight(a) - weight(b);
  return difference !== 0 ? difference : a.name.localeCompare(b.name);
}

/** True when anything in this set should stop a reviewer. */
export function hasBreaking(changes: Change[]): boolean {
  return changes.some(
    (change) => change.kind === "updated" && (change.downgrade || change.bump === "major"),
  );
}
