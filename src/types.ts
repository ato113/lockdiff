/** A single resolved dependency, as it appears in a lockfile. */
export interface Dependency {
  name: string;
  version: string;
  /** True when the package is only needed to build or test, not to run. */
  dev?: boolean;
}

export type Ecosystem = "npm" | "yarn" | "pip";

export type Bump = "major" | "minor" | "patch" | "other";

export interface Added {
  kind: "added";
  name: string;
  version: string;
  dev: boolean;
}

export interface Removed {
  kind: "removed";
  name: string;
  version: string;
  dev: boolean;
}

export interface Updated {
  kind: "updated";
  name: string;
  from: string;
  to: string;
  bump: Bump;
  /** True when the new version is lower than the old one. */
  downgrade: boolean;
  dev: boolean;
}

export type Change = Added | Removed | Updated;

export interface FileDigest {
  path: string;
  ecosystem: Ecosystem;
  changes: Change[];
}

export interface Digest {
  files: FileDigest[];
}
