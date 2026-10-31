# lockdiff

**Turn an unreadable lockfile diff into a summary a reviewer can actually check.**

[![CI](https://github.com/ato113/lockdiff/actions/workflows/ci.yml/badge.svg)](https://github.com/ato113/lockdiff/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A one-line dependency bump produces three thousand lines of `package-lock.json`.
Nobody reads it, so nobody notices the transitive package that quietly went from
`4.2.1` to `5.0.0` — or the one that appeared out of nowhere.

`lockdiff` reads the lockfile instead of the diff, and comments what actually changed.

---

## What the comment looks like

> ## Lockfile changes
>
> 14 changes across 1 file, including major version bumps.
>
> ### `package-lock.json`
>
> npm · 3 added, 10 updated, 1 removed
>
> **Worth a look**
>
> - `react` 18.3.1 → 19.0.0 — **major**
> - `tar-fs` 3.0.4 → 2.1.1 — **downgrade**
>
> <details>
> <summary>12 other changes</summary>
>
> - `clsx` added at 2.1.1
> - `picocolors` 1.0.1 → 1.1.1
> - ...
> </details>

Major bumps and downgrades sit at the top where they get read. Routine patch
bumps go in a collapsed section, so the comment stays short even when the
lockfile churns.

## Usage

```yaml
name: Dependencies

on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  lockdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed to read the base version of the lockfile

      - uses: ato113/lockdiff@v1
```

That's the whole setup. The action finds every lockfile the pull request
touches, works out what changed, and posts (or updates) one comment.

### Block major bumps

```yaml
      - uses: ato113/lockdiff@v1
        with:
          fail-on-major: true
```

The check then fails when a major bump or a downgrade appears, so it can sit in
your required checks.

### Use the result elsewhere

```yaml
      - uses: ato113/lockdiff@v1
        id: lockdiff
        with:
          comment: false

      - if: steps.lockdiff.outputs.breaking == 'true'
        run: echo "${{ steps.lockdiff.outputs.summary }}"
```

## Supported lockfiles

| Ecosystem | Files |
|-----------|-------|
| npm | `package-lock.json`, `npm-shrinkwrap.json` (v1, v2 and v3) |
| Yarn | `yarn.lock` (classic and Berry) |
| pip | `requirements*.txt` — exact `==` pins only |

Loose pip specifiers like `django>=4.0` are skipped rather than guessed at:
the file doesn't say which version you'll get, so neither does the summary.

## Inputs

| Input | Default | What it does |
|-------|---------|--------------|
| `github-token` | `${{ github.token }}` | Token used to post the comment |
| `files` | auto | Lockfiles to inspect, one per line. Defaults to every lockfile the PR touches |
| `base` | the PR base | Ref to compare against |
| `comment` | `true` | Post the summary as a PR comment, updating it on later pushes |
| `fail-on-major` | `false` | Fail the check on a major bump or a downgrade |

## Outputs

| Output | Example |
|--------|---------|
| `changed` | `14` |
| `breaking` | `true` |
| `summary` | `14 dependency changes, including major bumps.` |
| `body` | The full Markdown summary |

## Good to know

- **`fetch-depth: 0` is required.** The action reads the base version of the
  lockfile out of git history; a shallow clone doesn't have it. If it's missing,
  the action says so instead of silently reporting nothing.
- A `0.x` minor bump counts as major. In practice `0.1.0 → 0.2.0` breaks things,
  and a reviewer should see it.
- The comment is updated in place on each push, not posted again.
- If the token can't comment, the summary still lands in the Actions run summary
  and the step doesn't fail.

## Development

```bash
npm ci
npm test          # vitest
npm run typecheck
npm run build     # bundles src/ into dist/ with ncc
```

`dist/` is committed, because that's what GitHub runs. CI fails if it doesn't
match the source, so run `npm run build` before you commit.

## Contributing

Issues and pull requests welcome. Adding another ecosystem means writing one
parser in `src/parsers/` that turns the file into `{ name, version }` pairs —
everything downstream is shared.

AI-assisted contributions are fine as long as you say so in the pull request
and can explain what you're submitting.

## License

MIT — see [LICENSE](LICENSE).
