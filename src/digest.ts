import { diff } from "./diff";
import { showAtRef } from "./git";
import { detect, parse } from "./parsers";
import type { Digest, FileDigest } from "./types";

export interface BuildOptions {
  base: string;
  paths: string[];
  /** Reads the current contents of a path; injected so tests stay off disk. */
  readHead: (path: string) => Promise<string | null>;
  readBase?: (ref: string, path: string) => Promise<string | null>;
}

/** Compare every given lockfile against its state at the base ref. */
export async function build(options: BuildOptions): Promise<Digest> {
  const readBase = options.readBase ?? showAtRef;
  const files: FileDigest[] = [];

  for (const path of options.paths) {
    const ecosystem = detect(path);
    if (!ecosystem) continue;

    const [beforeRaw, afterRaw] = await Promise.all([
      readBase(options.base, path),
      options.readHead(path),
    ]);

    // Deleted lockfiles are reported by the diff itself, not by us.
    if (afterRaw === null) continue;

    const before = beforeRaw === null ? [] : parse(ecosystem, beforeRaw);
    const after = parse(ecosystem, afterRaw);

    files.push({ path, ecosystem, changes: diff(before, after) });
  }

  return { files };
}
