import { readFile } from "node:fs/promises";

import * as core from "@actions/core";
import * as github from "@actions/github";

import { build } from "./digest";
import { hasBreaking } from "./diff";
import { changedFiles, hasRef } from "./git";
import { detect } from "./parsers";
import { MARKER, render, summarize } from "./render";

function listInput(name: string): string[] {
  return core
    .getInput(name)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function readHead(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function upsertComment(token: string, body: string): Promise<void> {
  const context = github.context;
  const number = context.payload.pull_request?.number;
  if (!number) {
    core.info("Not a pull request, so there is nowhere to comment.");
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;

  const existing = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: number,
    per_page: 100,
  });
  const previous = existing.find((comment) => comment.body?.includes(MARKER));

  if (previous) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: previous.id, body });
    core.info(`Updated comment ${previous.id}.`);
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: number, body });
    core.info("Posted a new comment.");
  }
}

export async function run(): Promise<void> {
  const base =
    core.getInput("base") ||
    github.context.payload.pull_request?.base?.sha ||
    process.env["GITHUB_BASE_REF"] ||
    "";

  if (!base) {
    core.setFailed(
      "No base ref to compare against. Set the 'base' input, or run this on a pull request.",
    );
    return;
  }

  if (!(await hasRef(base))) {
    core.setFailed(
      `The base ref '${base}' is not in this clone. Add 'fetch-depth: 0' to actions/checkout.`,
    );
    return;
  }

  let paths = listInput("files");
  if (paths.length === 0) {
    const head = github.context.payload.pull_request?.head?.sha ?? "HEAD";
    paths = (await changedFiles(base, head)).filter((path) => detect(path) !== null);
  }

  if (paths.length === 0) {
    core.info("No lockfiles changed.");
    core.setOutput("changed", "0");
    core.setOutput("breaking", "false");
    core.setOutput("summary", "No dependency changes.");
    return;
  }

  const digest = await build({ base, paths, readHead });
  const total = digest.files.reduce((sum, file) => sum + file.changes.length, 0);
  const breaking = digest.files.some((file) => hasBreaking(file.changes));
  const body = render(digest);

  core.setOutput("changed", String(total));
  core.setOutput("breaking", String(breaking));
  core.setOutput("summary", summarize(digest));
  core.setOutput("body", body);

  await core.summary.addRaw(body).write();

  if (core.getBooleanInput("comment")) {
    const token = core.getInput("github-token");
    if (!token) {
      core.warning("No github-token supplied, so no comment was posted.");
    } else {
      try {
        await upsertComment(token, body);
      } catch (error) {
        // A missing permission should not fail the build — the summary is written either way.
        core.warning(`Could not post the comment: ${(error as Error).message}`);
      }
    }
  }

  if (breaking && core.getBooleanInput("fail-on-major")) {
    core.setFailed("A major version bump or a downgrade is in this pull request.");
  }
}

/* istanbul ignore next */
if (require.main === module) {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
