# CLAUDE.md

Guidance for working in this repo (Sriram's personal/academic site).

## What this site is

A Jekyll site on the "academicpages" (Minimal Mistakes fork) theme, currently being
redesigned in gwern.net's visual style — see the `gwern-redesign` branch. Reference
clone of gwern.net lives at `/home/sriram.sk/desktop/gwern.net` (sibling directory,
not part of this repo) — check its actual source (`build/`, `js/`, `css/`) before
assuming how a gwern feature works; don't guess from memory of the live site.

## Local dev environment

- The system Ruby (currently 3.4.x) is **too new** for this repo's pinned
  `Gemfile.lock` / bundler 2.2.33 combo (`DidYouMean::SPELL_CHECKERS` crash). A
  `ruby-2.7` binary is available at `/usr/bin/ruby-2.7` and works — install/run
  everything through it: `/usr/bin/ruby-2.7 -S bundle install`,
  `/usr/bin/ruby-2.7 -S bundle exec ruby-2.7 -S jekyll build` (note: `bundle exec ruby`
  alone re-resolves `ruby` via PATH to the system default and breaks — always pass
  `ruby-2.7` explicitly as the command bundle execs).
- Alternatively the repo's own `Dockerfile` (ruby:3.2) works and matches the GitHub
  Actions workflow's Ruby version.
- No headless browser is available in the assistant's sandbox — visual verification
  of layout/CSS changes should default to careful reasoning from compiled CSS
  (check computed widths/floats add up) plus asking the user to check in their
  browser (Firefox), rather than assuming a headless-Chrome tool will be available.

## Design direction (decided, not up for re-litigating without asking)

- **Light mode only** — no dark mode toggle, no dark-mode CSS.
- Typography: Source Serif 4 (body/headings) / Source Sans 3 (nav/UI chrome) /
  IBM Plex Mono (code), loaded via Google Fonts.
- **Links are plain blue** (`$link-color: #2b6cb0`), no underline at rest, underline
  on hover. This is a deliberate deviation from gwern's actual grayscale/no-blue
  link scheme — the user tried gwern's literal palette first and asked to switch to
  blue with a reference screenshot. Don't revert to grayscale links.
- Drop caps on the opening paragraph of `.page__content`, sized up with a small-caps
  first line — "fancier" was an explicit ask, don't make these subtle.
- Popovers (`assets/js/popovers.js`, `_sass/_popovers.scss`) are a from-scratch,
  small vanilla-JS engine inspired by gwern's `Popups`/`Extracts` architecture, not
  vendored from gwern.net directly (that code is ~5000+ lines tightly coupled to
  Hakyll's build and a curated annotation database this site doesn't have).
  - The popover **panel itself is dark** (black background, white text) — this is
    intentional and was an explicit fix (the default light popover was unreadable).
    Don't "fix" it back to match the light page theme.
  - External-link popovers default to a metadata card (title/description/favicon,
    built at build time by `_scripts/fetch_link_metadata.rb`) plus a plain
    "Open ↗" link. **Do not add automatic live-iframe embedding for arbitrary
    external links** — most sites send `X-Frame-Options`/CSP headers that silently
    or ugly-fail (this was tried and caused real reported bugs: midaslab.in,
    research.samsung.com). If live-iframe preview is wanted for specific sites,
    follow gwern's actual approach (`build/LinkLive.hs` in the gwern.net clone): a
    small, curl-verified allowlist of domains known not to block framing — never a
    blanket attempt.
  - Popovers bind to `.page__content a[href]` and `.author__urls a[href]` (sidebar
    social icons). If a new place on the site should get popovers, extend that
    selector rather than binding on all `a[href]` site-wide (nav/footer links are
    deliberately excluded).

## Workflow preferences

- Put non-trivial/large changes on a feature branch (e.g. `gwern-redesign`), not
  directly on `master` — the user asked for this explicitly for "big changes."
- Never push or flip the GitHub Pages source setting without being asked; land
  commits locally and let the user review.
- When a literal user request would reintroduce a bug that was just reported (e.g.
  "always use live preview" right after hitting an X-Frame-Options error from that
  exact feature), explain the tradeoff and propose the fix that serves the actual
  underlying complaint — don't silently comply if it visibly breaks, and don't
  silently ignore the request either.
- The user iterates fast with concrete, specific feedback (often screenshots/images
  attached inline) rather than abstract direction — implement directly rather than
  asking clarifying questions for things a reference image already answers.
