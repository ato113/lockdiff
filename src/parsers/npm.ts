import type { Dependency } from "../types";

interface LockV2Entry {
  version?: string;
  dev?: boolean;
  devOptional?: boolean;
}

interface LockV1Entry {
  version?: string;
  dev?: boolean;
  dependencies?: Record<string, LockV1Entry>;
}

interface PackageLock {
  lockfileVersion?: number;
  packages?: Record<string, LockV2Entry>;
  dependencies?: Record<string, LockV1Entry>;
}

/** Turn "node_modules/@scope/pkg/node_modules/dep" into "dep". */
function nameFromPath(path: string): string | null {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  if (index === -1) return null;
  const name = path.slice(index + marker.length);
  return name.length > 0 ? name : null;
}

/**
 * Parse a package-lock.json.
 *
 * Handles both the modern "packages" map (lockfileVersion 2 and 3) and the
 * nested "dependencies" tree of version 1. When a package appears more than
 * once at different versions, the first one wins — the summary is for humans,
 * and listing the same name three times helps nobody.
 */
export function parseNpm(content: string): Dependency[] {
  let lock: PackageLock;
  try {
    lock = JSON.parse(content) as PackageLock;
  } catch {
    throw new Error("package-lock.json is not valid JSON");
  }

  const found = new Map<string, Dependency>();

  if (lock.packages) {
    for (const [path, entry] of Object.entries(lock.packages)) {
      if (path === "") continue; // the project itself
      const name = nameFromPath(path);
      if (!name || !entry.version) continue;
      if (!found.has(name)) {
        found.set(name, {
          name,
          version: entry.version,
          dev: Boolean(entry.dev ?? entry.devOptional),
        });
      }
    }
  }

  if (found.size === 0 && lock.dependencies) {
    const walk = (tree: Record<string, LockV1Entry>): void => {
      for (const [name, entry] of Object.entries(tree)) {
        if (entry.version && !found.has(name)) {
          found.set(name, { name, version: entry.version, dev: Boolean(entry.dev) });
        }
        if (entry.dependencies) walk(entry.dependencies);
      }
    };
    walk(lock.dependencies);
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}
