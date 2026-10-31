import type { Dependency } from "../types";

/**
 * Parse a pinned requirements file.
 *
 * Only exact pins (`package==1.2.3`) carry a version worth comparing, so
 * looser specifiers, editable installs, URLs and `-r` includes are skipped
 * rather than guessed at. Environment markers and extras are stripped.
 */
export function parsePip(content: string): Dependency[] {
  const found = new Map<string, Dependency>();

  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;

    // Drop inline comments, environment markers and hashes.
    line = line.split(" #")[0] ?? line;
    line = line.split(";")[0] ?? line;
    line = line.split("--hash")[0] ?? line;
    line = line.trim();

    const match = /^([A-Za-z0-9._-]+)\s*(?:\[[^\]]*\])?\s*==\s*([^\s,]+)$/.exec(line);
    if (!match) continue;

    const rawName = match[1];
    const version = match[2];
    if (!rawName || !version) continue;

    // PyPI treats runs of - _ . as equivalent and is case-insensitive.
    const name = rawName.toLowerCase().replace(/[-_.]+/g, "-");
    if (!found.has(name)) found.set(name, { name, version });
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}
