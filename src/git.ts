import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Read a file as it was at a given commit.
 *
 * Returns null when the file did not exist there, which is how a newly added
 * lockfile shows up.
 */
export async function showAtRef(ref: string, path: string): Promise<string | null> {
  try {
    const { stdout } = await run("git", ["show", `${ref}:${path}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
}

/** List the files that differ between two refs. */
export async function changedFiles(base: string, head: string): Promise<string[]> {
  try {
    const { stdout } = await run("git", ["diff", "--name-only", `${base}...${head}`], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** True when the ref exists locally — a shallow clone often lacks the base. */
export async function hasRef(ref: string): Promise<boolean> {
  try {
    await run("git", ["cat-file", "-e", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}
