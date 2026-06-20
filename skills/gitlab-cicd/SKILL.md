---
name: gitlab-cicd
description: GitLab CI/CD pipelines for Tauri 2 desktop app (Worf) — build, test, and release (macOS)
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Create and maintain `.gitlab-ci.yml` for the **worf** Tauri 2 desktop app (React 19 + TypeScript frontend, Rust backend, SQLite)
- Set up CI pipelines for **frontend lint/typecheck/test** (Node.js 22, Vitest), **Rust backend tests** (cargo test), **E2E tests** (WDIO + Tauri webdriver)
- Set up **build pipelines** for macOS universal .dmg (Apple Silicon + Intel)
- Set up a **release pipeline** triggered by Git tags (`v*`)
- Cache npm dependencies, Cargo registry, and Cargo build artifacts across pipeline runs
- Convert existing GitHub Actions workflows to GitLab CI equivalents (release API, CI/CD variables, job artifacts)

## When to use me
Use when creating a `.gitlab-ci.yml` from scratch for this Tauri 2 project, migrating from GitHub Actions to GitLab CI/CD, adding or modifying CI pipeline stages, troubleshooting CI build failures, or configuring GitLab releases. Invoke this skill whenever the user mentions "GitLab CI", ".gitlab-ci.yml", "CI/CD pipeline", or "GitLab release".

---

## GitLab CI Architecture

### Pipeline Overview

```
┌─────────────────────────────────────────────────────┐
│                     Pipeline                          │
│                                                       │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐        │
 │  │   test    │───▶│    build     │───▶│ release  │        │
 │  │           │    │              │    │          │        │
 │  │ frontend  │    │ macos-universal │ tag v*   │        │
 │  │ rust      │    │              │    │ only     │        │
 │  │ e2e       │    │              │    │          │        │
 │  └──────────┘    └──────────────┘    └──────────┘        │
└─────────────────────────────────────────────────────┘
```

### Stages (ordered)

| Stage | Jobs | Description |
|---|------|-------------|
| `test` | `frontend`, `rust`, `e2e` | Lint, typecheck, unit tests, integration tests |
| `build` | `macos-universal` | macOS universal Tauri build (.dmg) |
| `release` | `release` | Create GitLab Release from tagged builds |

### Job Templates

Use GitLab's `extends` keyword with hidden job templates (`.` prefix) to avoid repetition:

- **`.node_template`** — Shared Node.js 22 setup (install, cache)
- **`.rust_template`** — Shared Rust toolchain setup
- **`.macos_rust_targets`** — macOS universal build Rust targets

### Full `.gitlab-ci.yml` Structure

```yaml
stages:
  - test
  - build
  - release

variables:
  # Prevent Tauri from prompting for keychain access
  TAURI_SIGNING_IDENTITY: "-"
  # Set NPM cache
  npm_config_cache: "$CI_PROJECT_DIR/.npm"
  # Rust/Cargo cache
  CARGO_HOME: "$CI_PROJECT_DIR/.cargo"

# -------------------------------------------------------------------
# Job Templates (hidden, start with `.`)
# -------------------------------------------------------------------

.node_template: &node_template
  image: node:22
  before_script:
    - npm ci --prefer-offline --no-audit --no-fund
  cache:
    key: ${CI_COMMIT_REF_SLUG}-node
    paths:
      - .npm/
      - node_modules/
    policy: pull-push

.rust_template: &rust_template
  before_script:
    - curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    - source "$HOME/.cargo/env"
  cache:
    key: ${CI_COMMIT_REF_SLUG}-cargo
    paths:
      - .cargo/registry/
      - .cargo/git/
      - src-tauri/target/
    policy: pull-push

.macos_rust_targets: &macos_rust_targets
  before_script:
    - curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    - source "$HOME/.cargo/env"
    - rustup target add aarch64-apple-darwin x86_64-apple-darwin

# -------------------------------------------------------------------
# Stage: test
# -------------------------------------------------------------------

frontend-test:
  stage: test
  image: node:22
  <<: *node_template
  script:
    # TypeScript type-check via tsc
    - npx tsc --noEmit
    # Build check (Vite)
    - npm run build
    # Run Vitest unit tests
    - npm test
  artifacts:
    reports:
      junit: junit.xml
    paths:
      - dist/
    expire_in: 30 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_TAG
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_BRANCH =~ /^feat/

rust-test:
  stage: test
  image: rust:latest
  <<: *rust_template
  script:
    - cd src-tauri
    - cargo test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_TAG
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_BRANCH =~ /^feat/

# E2E tests are more complex — see dedicated section below
e2e-test:
  stage: test
  image: node:22
  <<: *node_template
  variables:
    # Use xvfb for headless display on Linux
    DISPLAY: ":99"
  before_script:
    # Install display server + webdriver dependencies
    - apt-get update -qq
    - apt-get install -y -qq xvfb libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0
        libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1
        libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
    # Run Node setup
    - npm ci --prefer-offline --no-audit --no-fund
  script:
    # Start virtual display
    - Xvfb :99 -screen 0 1920x1080x24 &
    # Install Chromium for webdriver
    - npx playwright install chromium
    # Start Tauri with webdriver feature in background
    - npx tauri dev --features webdriver &
    # Wait for webdriver to be ready
    - npx wait-on http://127.0.0.1:4445
    # Run E2E tests
    - npm run test:e2e
  timeout: 30m
  allow_failure: true  # E2E flakiness is expected in CI
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_BRANCH =~ /^feat/

# -------------------------------------------------------------------
# Stage: build
# -------------------------------------------------------------------

macos-universal:
  stage: build
  tags:
    - macos  # Requires macOS GitLab runner
  <<: *macos_rust_targets
  script:
    - npm ci --prefer-offline --no-audit --no-fund
    - npm run build
    - npx tauri build --target universal-apple-darwin --config src-tauri/tauri.conf.release.json
  artifacts:
    name: "${CI_JOB_NAME}_${CI_COMMIT_TAG}"
    paths:
      - src-tauri/target/universal-apple-darwin/release/bundle/dmg/
    expire_in: 90 days
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
      when: on_success
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true

# -------------------------------------------------------------------
# Stage: release
# -------------------------------------------------------------------

release:
  stage: release
  image: node:22
  needs:
    - macos-universal
  script:
    # Generate release notes from CHANGELOG or git log
    - |
      echo "## Release $CI_COMMIT_TAG" > release_notes.md
      echo "" >> release_notes.md
      echo "### Downloads" >> release_notes.md
      echo "" >> release_notes.md
    # List built artifacts
    - echo "Artifacts:" && find . -name "*.dmg" | head -20
    # Create GitLab Release using glab CLI or GitLab Release API
    - |
      PACKAGE_REGISTRY_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic"
      VERSION="${CI_COMMIT_TAG}"
      for file in $(find src-tauri/target -name "*.dmg"); do
        filename=$(basename "$file")
        # Upload to GitLab Package Registry
        curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
             --upload-file "$file" \
             "${PACKAGE_REGISTRY_URL}/worf/${VERSION}/${filename}"
      done
    # Create release via API
    - |
      curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
           --header "Content-Type: application/json" \
           --data "{
             \"name\": \"Worf ${VERSION}\",
             \"tag_name\": \"${VERSION}\",
             \"description\": \"$(cat release_notes.md | jq -Rs .)\",
             \"assets\": {
               \"links\": []
             }
           }" \
           "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases"
  artifacts:
    paths:
      - release_notes.md
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
```

---

## Pipeline Stages (Detailed)

### 1. Test Stage

#### Frontend Test (`frontend-test`)

Runs on every MR, default branch, and `feat/*` branches. Also runs on tags.

**What it does:**
1. `npm ci` — Clean install from lockfile
2. `npx tsc --noEmit` — TypeScript type checking
3. `npm run build` — Vite build (also validates config)
4. `npm test` — Vitest unit tests

**Caching:** `node_modules/` is cached per-branch to speed up subsequent runs. The `--prefer-offline` flag minimizes network requests.

**Why `tsc --noEmit` separately from `vite build`:** The `build` script in `package.json` runs `tsc && vite build`, but splitting them lets us see which step failed in the job log.

#### Rust Backend Test (`rust-test`)

Runs on the same triggers as frontend tests.

**What it does:**
1. Installs Rust via rustup
2. `cd src-tauri && cargo test` — Runs all Rust tests (unit + integration)

**Caching:** The `src-tauri/target/` directory and Cargo registry are both cached. This dramatically speeds up subsequent runs since Rust compiles dependencies from source.

> ⚠️ **Cargo target cache caveat:** If `src-tauri/Cargo.lock` changes, the cached target directory may contain stale artifacts. In that case, clear the cache manually in GitLab or use a cache key that includes the lockfile hash: `key: ${CI_COMMIT_REF_SLUG}-cargo-${hash(src-tauri/Cargo.lock)}`

#### E2E Test (`e2e-test`)

The most complex test job. Requires:
- A virtual display server (xvfb on Linux)
- Tauri running in dev mode with the `webdriver` feature
- Tauri's webdriver server at `127.0.0.1:4445`
- Chromium (for WDIO)

**Complexities:**
- Tauri cannot run in Docker without GPU passthrough. For GitLab CI, you need either:
  - A Linux runner with GPU support
  - Or use `webdriver` with Chromium in headless mode on a Linux Docker runner with `--security-opt seccomp=unconfined`
  - macOS GitLab runners with GUI support work natively
- The `xvfb` virtual framebuffer provides a fake display for Tauri
- Job timeout is set to 30m because Tauri builds + webdriver startup is slow
- E2E tests have `allow_failure: true` because they are inherently flaky in CI

### 2. Build Stage

#### macOS Universal Build (`macos-universal`)

**Runner requirement:** `macos` tag — requires a macOS GitLab runner (e.g., GitLab SaaS macOS runner or self-hosted Mac mini).

**What it does:**
1. Installs Rust with both `aarch64-apple-darwin` and `x86_64-apple-darwin` targets
2. `npm ci` + `npm run build` (frontend build)
3. `npx tauri build --target universal-apple-darwin --config src-tauri/tauri.conf.release.json` — Produces a universal `.dmg` containing both ARM and Intel code

**Output artifact:** `src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg`

**Code signing:** By default, uses `-` (ad-hoc signing identity). For distribution outside the Mac App Store, set these GitLab CI/CD variables:
- `APPLE_SIGNING_IDENTITY` — Your Apple Developer signing certificate name
- `APPLE_ID` — Apple ID email for notarization
- `APPLE_APP_SPECIFIC_PASSWORD` — App-specific password
- `APPLE_TEAM_ID` — Apple Team ID

These are passed to Tauri via environment variables — Tauri CLI picks them up automatically.

### 3. Release Stage

#### Release (`release`)

Only runs on tags matching `v*` (e.g., `v1.0.0`, `v0.2.3`).

**What it does:**
1. **Waits** for the macOS build job to succeed (`needs:`)
2. Collects the artifact path (`.dmg`)
3. Uploads each artifact to the **GitLab Package Registry** (a generic package per version)
4. Creates a **GitLab Release** via the GitLab Releases API

**GitHub Actions → GitLab CI conversion reference:**

| GitHub Actions | GitLab CI Equivalent |
|---|---|
| `softprops/action-gh-release@v2` | GitLab Releases API (curl) + Package Registry upload |
| `secrets.GITHUB_TOKEN` | `GITLAB_TOKEN` CI/CD variable (or `CI_JOB_TOKEN`) |
| `generate_release_notes: true` | Manual release notes via `CI_COMMIT_TAG` + changelog |
| `${{ github.ref_name }}` | `$CI_COMMIT_TAG` |
| `${{ github.repository }}` | `$CI_PROJECT_PATH` |

**Required CI/CD variable:** `GITLAB_TOKEN` — A GitLab personal access token with `api` scope. Alternatively, use `CI_JOB_TOKEN` if the release job is in the same project.

---

## Caching Strategy

### npm Cache

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}-node
  paths:
    - .npm/
    - node_modules/
  policy: pull-push
```

- **`key`** includes the branch slug so different branches get separate caches
- **`paths`** caches both the npm global cache (`.npm/`) and `node_modules/`
- **`policy: pull-push`** restores on job start and saves on job finish

### Cargo Cache

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}-cargo
  paths:
    - .cargo/registry/
    - .cargo/git/
    - src-tauri/target/
  policy: pull-push
```

The Cargo target directory is large (often 1-3 GB per build). Caching it saves significant time on subsequent builds. However, be aware of the caveats below.

### Advanced: Lockfile-based Cache Keys

To invalidate caches automatically when dependencies change:

```yaml
cache:
  key:
    files:
      - package-lock.json
    prefix: ${CI_COMMIT_REF_SLUG}-node
  paths:
    - node_modules/
```

And for Cargo:

```yaml
cache:
  key:
    files:
      - src-tauri/Cargo.lock
    prefix: ${CI_COMMIT_REF_SLUG}-cargo
  paths:
    - .cargo/registry/
    - .cargo/git/
    - src-tauri/target/
```

---

## Variables / Secrets Needed

Configure these as **GitLab CI/CD Variables** (Settings → CI/CD → Variables):

| Variable | Scope | Description |
|---|---|---|
| `GITLAB_TOKEN` | All environments | Personal access token with `api` scope, for creating releases |
| `APPLE_SIGNING_IDENTITY` | `production` only (or leave as `-` for ad-hoc) | Apple Developer signing certificate name |
| `APPLE_ID` | `production` only | Apple ID email for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | `production` only | App-specific password for notarization |
| `APPLE_TEAM_ID` | `production` only | Apple Team ID |
| `APPLE_KEYCHAIN_PASSWORD` | `production` only | Password for temporary keychain on CI |

Set `APPLE_SIGNING_IDENTITY` to `-` in the GitLab UI if you only need ad-hoc signing (no distribution).

---

## GitLab Runner Requirements

### macOS Runner

For the `macos-universal` job, you need a macOS runner with:

- **Hardware:** Apple Silicon (M1/M2/M3) or Intel Mac
- **Software:** macOS 12+ (Monterey or later)
- **Tools:** Xcode Command Line Tools, Homebrew
- **GitLab tag:** `macos` (matching the job's `tags: [macos]`)

**GitLab SaaS macOS runners** are available on GitLab.com premium plans. Self-hosted options include Mac minis or MacStadium.

### Linux Runner

The `e2e-test` job uses a Docker image and can run on **any** GitLab runner with Docker executor:

- **Docker executor:** Required for `image: node:22`
- **GitLab tag:** Not required (no `tags:` in these jobs)

---

## Merge Request Integration

For MR pipelines, the test stage runs automatically:

```yaml
frontend-test:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_TAG
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

This means:
1. Every MR gets frontend + Rust tests
2. Every push to `main` gets tests
3. Tag pushes trigger full pipeline (test → build → release)

### Status Badge

Add a pipeline status badge to `README.md`:

```markdown
[![pipeline status](https://gitlab.com/<namespace>/<project>/badges/main/pipeline.svg)](https://gitlab.com/<namespace>/<project>/-/commits/main)
```

---

## Converting from GitHub Actions

### Equivalent Concepts

| GitHub Actions | GitLab CI |
|---|---|
| `jobs.<id>.runs-on` | `tags` + `image` |
| `steps` | `script` (array of commands) |
| `actions/*` | `before_script` / inline commands |
| `uses` | Not available — use Docker images or inline scripts |
| `with:` | Job variables or CLI arguments |
| `env:` | `variables:` (job-level or global) |
| `upload-artifact` | `artifacts:` with `paths` |
| `download-artifact` | `dependencies:` or `needs:` |
| `checkout@v4` | Automatic (GitLab checks out by default) |
| `setup-node@v4` | Use `image: node:22` instead |
| `setup-rust-toolchain` | Manual `rustup` in `before_script` |
| `softprops/action-gh-release` | GitLab Releases API + Package Registry |

### Key Differences

1. **No composite actions in GitLab CI** — Everything is inline `script` or split into templates
2. **GitLab artifacts expire** — Set `expire_in` to avoid storage bloat
3. **GitLab caching is optional** — You must explicitly configure cache paths
4. **macOS runners are a premium feature** — GitLab SaaS macOS runners require GitLab Premium/Ultimate

---

## Gotchas & Caveats

### 1. Cargo Target Cache Poisoning

The cached `src-tauri/target/` directory can contain stale build artifacts if:
- Rust toolchain is updated
- `Cargo.lock` changes substantially

**Fix:** Either clear the GitLab cache manually (CI/CD → Cache) or use lockfile-based cache keys (see Caching Strategy section).

### 2. macOS Universal Build is Slow

Building for both `aarch64-apple-darwin` and `x86_64-apple-darwin` requires compiling Rust dependencies **twice** (once per architecture). Expect 20-40 minutes on shared macOS runners.

**Optimization:** Use sccache (Mozilla's compiler cache) to cache object files across architectures:

```yaml
before_script:
  - cargo install sccache
  - export RUSTC_WRAPPER=sccache
```

### 3. E2E Tests Need a Display Server

Tauri requires a display server (X11 or Wayland) to render. In a Docker container:
- **xvfb** provides a virtual display
- Or use `--security-opt seccomp=unconfined` on GitLab runner config
- Or run E2E on a macOS runner (which has a display server by default)

### 4. GitLab CI Variables Take Precedence Over `variables:` Block

If you set `APPLE_SIGNING_IDENTITY` in both the CI/CD Variables UI and the YAML `variables:` block, the **UI variable** wins (it has higher precedence). Use the `variables:` block for defaults and the UI for overrides.

### 5. Git Token for Release

`CI_JOB_TOKEN` works for releases within the same project but **not** for cross-project releases. For cross-project or if you need scoped access, use a personal access token as `GITLAB_TOKEN`.

### 6. Tag Pipeline vs Branch Pipeline

When you push a tag (e.g., `v1.0.0`), GitLab creates a tag pipeline. The `rules:` blocks in build and release jobs check for `$CI_COMMIT_TAG` to distinguish tag pipelines from branch pipelines.

### 7. npm install vs npm ci

Always prefer `npm ci` in CI:
- Faster (skips dependency resolution)
- Deterministic (uses lockfile)
- Fails if `package-lock.json` is out of sync with `package.json`
- Use `--prefer-offline` to reduce network requests

### 8. Tauri Config for CI

The release build uses `src-tauri/tauri.conf.release.json` (bundles settings, signing identity, etc.). The dev config `src-tauri/tauri.conf.json` uses `com.worf.desktop.dev` identifier. Ensure the release config has all production bundle settings correct before CI runs.

### 9. Rust Test File Paths

The `cargo test` command in `test:rust` might display file paths relative to `src-tauri/`. This is expected behavior — the actual Rust source is in `src-tauri/src/`.

---

## Quickstart: First-Time Setup

1. **Set up GitLab CI variables** (Settings → CI/CD → Variables):
   - Add `GITLAB_TOKEN` (masked)
   - Add `APPLE_SIGNING_IDENTITY` = `-` (for ad-hoc, or your cert name)

2. **Create `.gitlab-ci.yml`** in project root with the full YAML from this skill

3. **Push a commit to `main`** — verify the test pipeline runs

4. **Create an MR** — verify MR pipeline runs tests

5. **Push a tag** (`git tag v0.1.0 && git push origin v0.1.0`) — verify full release pipeline

6. **Check GitLab Releases** (Deployments → Releases) for the uploaded artifacts

---

## Example: Minimal `.gitlab-ci.yml` (Quick Start)

If you want the absolute minimum to get CI running for tests only (no builds, no releases):

```yaml
stages:
  - test

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

frontend:
  image: node:22
  stage: test
  script:
    - npm ci --prefer-offline --no-audit --no-fund
    - npx tsc --noEmit
    - npm run build
    - npm test

rust:
  image: rust:latest
  stage: test
  before_script:
    - curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    - source "$HOME/.cargo/env"
  cache:
    key: ${CI_COMMIT_REF_SLUG}-cargo
    paths:
      - .cargo/registry/
      - .cargo/git/
      - src-tauri/target/
  script:
    - cd src-tauri && cargo test
```