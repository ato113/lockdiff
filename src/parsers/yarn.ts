import type { Dependency } from "../types";

/**
 * Parse a classic (v1) yarn.lock.
 *
 * The format is a series of blocks: one or more quoted descriptors, a colon,
 * then an indented body holding `version "x.y.z"`. Berry (v2+) lockfiles are
 * YAML and carry a `__metadata` block; they are close enough in shape that the
 * same scan works for the fields we care about.
 */
export function parseYarn(content: string): Dependency[] {
  const found = new Map<string, Dependency>();
  const lines = content.split(/\r?\n/);

  let descriptors: string[] = [];

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    // A block header sits at column 0 and ends with a colon.
    if (!/^\s/.test(line) && line.trimEnd().endsWith(":")) {
      const header = line.trimEnd().slice(0, -1);
      descriptors = header
        .split(",")
        .map((part) => part.trim().replace(/^"|"$/g, ""))
        .filter((part) => part.length > 0 && part !== "__metadata");
      continue;
    }

    const versionMatch = /^\s+version:?\s+"?([^"\s]+)"?\s*$/.exec(line);
    if (versionMatch && descriptors.length > 0) {
      const version = versionMatch[1];
      if (!version) continue;
      for (const descriptor of descriptors) {
        const name = nameFromDescriptor(descriptor);
        if (name && !found.has(name)) {
          found.set(name, { name, version });
        }
      }
      descriptors = [];
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** "@scope/pkg@^1.2.3" -> "@scope/pkg";  "pkg@npm:^1.0.0" -> "pkg". */
function nameFromDescriptor(descriptor: string): string | null {
  const separator = descriptor.lastIndexOf("@");
  if (separator <= 0) return descriptor.length > 0 ? descriptor : null;
  return descriptor.slice(0, separator);
}
