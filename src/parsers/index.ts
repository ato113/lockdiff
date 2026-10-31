import type { Dependency, Ecosystem } from "../types";
import { parseNpm } from "./npm";
import { parsePip } from "./pip";
import { parseYarn } from "./yarn";

export { parseNpm, parsePip, parseYarn };

/** Work out which ecosystem a lockfile belongs to from its filename. */
export function detect(path: string): Ecosystem | null {
  const file = path.split("/").pop()?.toLowerCase() ?? "";
  if (file === "package-lock.json" || file === "npm-shrinkwrap.json") return "npm";
  if (file === "yarn.lock") return "yarn";
  if (file.endsWith(".txt") && file.includes("requirements")) return "pip";
  return null;
}

export function parse(ecosystem: Ecosystem, content: string): Dependency[] {
  switch (ecosystem) {
    case "npm":
      return parseNpm(content);
    case "yarn":
      return parseYarn(content);
    case "pip":
      return parsePip(content);
  }
}
