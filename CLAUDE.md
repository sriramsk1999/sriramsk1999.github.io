# CLAUDE.md

Guidance for working in this repo (Sriram's personal/academic site).

## What this site is

A Jekyll site on the "academicpages" (Minimal Mistakes fork) theme, redesigned in
gwern.net's visual style. The redesign is **merged to `master` and live** at
sriramsk1999.github.io — this is no longer a branch-in-progress. Reference clone of
gwern.net lives at `/home/sriram.sk/desktop/gwern.net` (sibling directory, not part
of this repo) — check its actual source (`build/`, `js/`, `css/`) before assuming
how a gwern feature works; don't guess from memory of the live site.

## Local dev environment

- The system Ruby (currently 3.4.x) is **too new** for this repo's pinned
  `Gemfile.lock` / bundler 2.2.33 combo (`DidYouMean::SPELL_CHECKERS` crash). A
  `ruby-2.7` binary is available at `/usr/bin/ruby-2.7` and works — install/run
  everything through it: `/usr/bin/ruby-2.7 -S bundle install`,
  `/usr/bin/ruby-2.7 -S bundle exec ruby-2.7 -S jekyll build` (note: `bundle exec ruby`
  alone re-resolves `ruby` via PATH to the system default and breaks — always pass
  `ruby-2.7` explicitly as the command bundle execs). This double-naming is a
  sandbox-local quirk (multiple Rubies coexisting); it is NOT needed in GitHub
  Actions, which only has the one Ruby `ruby/setup-ruby@v1` installs.
- The repo's own `Dockerfile` (ruby:3.2) also works, but only because it `COPY`s
  `Gemfile` and NOT `Gemfile.lock`, so `bundle install` there resolves a fresh set
  of gem versions instead of using the pinned ones. Don't take the Dockerfile's
  Ruby version as evidence of what the *lockfile* supports — nokogiri 1.12.5
  (pinned) requires Ruby `< 3.1`, which is why the Actions workflow is pinned to
  2.7, not 3.2 (this broke CI once; see git history on `.github/workflows/deploy.yml`).
- No headless browser is available in the assistant's sandbox — large binary
  downloads (e.g. Playwright's Chromium) get silently truncated here, and this is a
  sandbox restriction, not a disk/permissions issue worth fighting. Anything needing
  a real browser (headless Chrome archiving, visual layout verification) has to
  either wait for a real GitHub Actions run, or be verified by careful reasoning
  from compiled CSS plus asking the user to check in their browser (Firefox).

## This repo has two git remotes

`origin` = sriramsk1999/sriramsk1999.github.io (the real repo), `upstream` =
academicpages/academicpages.github.io (the upstream template, an unrelated public
project with its own bots/PRs/workflows). **`gh` CLI commands default to `upstream`**
when both remotes are configured and no repo is specified — `gh run list`, `gh
workflow list`, etc. silently returned upstream's data once, which looked like
mysterious bot activity on this repo but wasn't. Always pass `-R
sriramsk1999/sriramsk1999.github.io` explicitly to any `gh` command here.

## Deploy: pushing to master is live, not staging

GitHub Pages source is set to `"build_type":"workflow"` — `.github/workflows/deploy.yml`
runs on every push to `master` and actually deploys. There is no separate
staging step. After pushing, watch the run rather than assuming success:
`gh run watch $(gh run list -R sriramsk1999/sriramsk1999.github.io --limit 1 --json databaseId --jq '.[0].databaseId') -R sriramsk1999/sriramsk1999.github.io --exit-status`,
and pull failure logs with `gh run view <id> -R <repo> --log-failed` if it's red.
The workflow also runs `_scripts/fetch_link_metadata.rb` and `_scripts/archive_pages.rb`
before building, and commits back anything they produce as a `github-actions[bot]`
commit — `git pull`/`fetch` after a green run if you need what it generated (real
snapshots/metadata only exist after a live CI run; this sandbox can't produce them).

## Design direction

- **Light mode only** — no dark mode toggle, no dark-mode CSS.
- Typography: Source Serif 4 (body/headings) / Source Sans 3 (nav/UI chrome) /
  IBM Plex Mono (code), loaded via Google Fonts.
- **Links are grayscale** (`$link-color: #333`, hover `#888`, visited `#666`,
  matching gwern's actual `--GW-body-link-*` palette), underlined by default
  (not just on hover — grayscale text needs the underline for contrast against
  body copy). A blue/no-default-underline variant was tried and explicitly
  reverted — don't reintroduce it without being asked again.
- Drop caps on the opening paragraph of `.page__content`, sized up and bold —
  "fancier" was an explicit ask. The small-caps opening-flourish is done by
  `assets/js/dropcap.js`, wrapping a fixed word budget in real `<span>`s at
  runtime — **not** CSS `::first-line`. That was the first approach and it has a
  real Firefox bug: a floated `::first-letter` combined with `::first-line`
  mis-computes the line box and produced a visible blank gap after the first
  linked phrase on the About page. Don't go back to `::first-line` for this.
- Single-post pages (`_layouts/single.html`) do **not** show a Tags footer,
  Previous/Next pagination, or a "You May Also Enjoy" related-posts grid —
  removed per request. Don't re-add without being asked.
- Masthead top-left link text is the literal string `"Home"`, not `{{ site.title }}`
  (`_includes/masthead.html`) — `site.title` itself is untouched since it still
  drives page `<title>`/SEO tags elsewhere. Similarly, `_includes/seo.html` prefers
  an optional `page.seo_title` front-matter field over `page.title` for the
  `<title>` tag specifically, so a page's H1 and its browser-tab title can differ
  (used on the About page: H1 "Sriram Krishna", tab title "Home - Sriram Krishna").

## Popovers (`assets/js/popovers.js`, `_sass/_popovers.scss`)

A from-scratch, small vanilla-JS engine inspired by gwern's `Popups`/`Extracts`
architecture, not vendored from gwern.net directly (that code is ~5000+ lines
tightly coupled to Hakyll's build and a curated annotation database this site
doesn't have). Binds to `.page__content a[href]` and `.author__urls a[href]`
(sidebar social icons) — extend that selector, don't bind `a[href]` site-wide.
Dynamically-injected content (e.g. the About-page quote widget) must call
`window.GW_popovers.bindWithin(container)` after rendering, or its links never
get bound — popovers.js only scans the DOM once at load.

The popover **panel itself is dark** (black background, white text) — this was an
explicit, deliberate fix for a real readability bug (turned out to be the page
*footer*, mis-diagnosed as "the footnote panel" at first — the footer was actually
the unreadable grey-on-grey element). Don't "fix" the popover panel back to light.

**External-link popover priority, in order** (see `externalHandler` in popovers.js):
1. `_data/local-archives.json` (url → local path): a same-origin static HTML
   snapshot, iframed directly. Generated by `_scripts/archive_pages.rb`, which runs
   real headless Chrome in CI against a small curated `URLS` list — the small-scale
   version of gwern's actual answer to "domain blocks framing" (`build/LinkArchive.hs`
   in a gwern.net checkout: SingleFile + headless Chromium mirroring ~14,000 pages
   server-side, framed instead of the original). Add a URL here for a specific page
   worth previewing whose domain is blocked. **Validate the dump before trusting it**
   — `--dump-dom` exits 0 and writes a full HTML document even when navigation
   fails; a real bug shipped a snapshot that was literally Chrome's own "DNS address
   could not be found" error page, committed as if it were the real site. `archive_pages.rb`'s
   `rejection_reason()` now checks for that plus bot-challenge interstitials before
   accepting a dump — keep that check if you touch this file.
2. `_data/live-link-domains.json` (hostname → bool): domains curl-verified to not
   send `X-Frame-Options`/CSP `frame-ancestors`, iframed live, no card. Checked by
   `_scripts/fetch_link_metadata.rb`'s `frameable?()`. **Never** attempt live-iframe
   on a domain not in this allowlist — most sites block framing and fail silently
   or ugly (real reported bugs: midaslab.in, research.samsung.com).
3. Otherwise, a metadata card (title/description/favicon scraped at build time) plus
   a plain "Open ↗" link — gwern's own fallback when live isn't available either.
   There is no toggle button anywhere in this UI (tried twice, removed both times —
   the domain-gated priority above replaces it).

**arXiv gets real API-based annotations**, not generic scraping — `fetch_link_metadata.rb`'s
`arxiv_id()`/`fetch_arxiv_metadata()` calls arXiv's Export API for real title +
abstract (works for `/pdf/` URLs too, which a generic scraper can't reach at all
since they're non-HTML). Matches gwern's own `build/Annotation/Arxiv.hs` — he never
iframes arxiv.org either, since it sends `X-Frame-Options` like most sites.

**OpenReview is a dead end for scraping, API included**: `api2.openreview.net` and
`api.openreview.net` both return `403 ChallengeRequiredError` to any non-browser
client, even with a realistic User-Agent — confirmed by testing directly, not
assumed. No server-side fix is possible; it's in `archive_pages.rb`'s candidate list
on the theory that a real headless browser might pass the challenge where a bare
HTTP client can't, but this is unverified (untested locally — no headless browser
here — and the first CI attempt also got served the challenge page, correctly
detected and rejected rather than cached as garbage).

**Known-unfixable case**: LinkedIn blocks scraping aggressively and isn't in the
local-archive list — a real browser is likely to just hit the same login-wall
content a bot would. This is an expected, permanent "no preview" fallback, not a bug.

**Metadata quality gate**: `fetch_link_metadata.rb`'s `JUNK_TITLE_RE` (and
`archive_pages.rb`'s `rejection_reason()`) reject known bot-challenge/interstitial
titles ("Verifying your browser", "Just a moment", "Attention Required", etc.) so a
200 response with a challenge page doesn't get cached as if it were real content —
this happened once for real (openreview.net) before the filter existed.

**Link-extraction regex gotcha**: `LINK_RE` in `fetch_link_metadata.rb` uses
non-greedy `\[.*?\]\(...\)`, not `\[[^\]]*\]\(...\)` — the greedy/negated-class form
cannot match doubled-bracket citation styles like `[[1]](url)` (common in this
site's older posts), because `[^\]]*` can't span the inner `]` before the outer one.
This silently dropped an entire post's citation links from ever being scraped; if
metadata seems to be missing for a link that's clearly in a content file, check
whether it's using an unusual bracket style before assuming it's a fetch failure.

## Domain-specific gotchas already found (don't re-discover these)

- `www.research.samsung.com` does not resolve at all (not just blocked — genuinely
  unreachable, confirmed independently by both this sandbox and the user's own
  browser); `research.samsung.com` (no `www`) works fine. Always use the bare form.
- `openreview.net` — see above, bot-challenge on everything including its API.
- LinkedIn — see above, expected permanent no-preview case.

## Workflow preferences

- When a literal user request would reintroduce a bug that was just reported (e.g.
  "always use live preview" right after hitting an X-Frame-Options error from that
  exact feature), explain the tradeoff and propose the fix that serves the actual
  underlying complaint — don't silently comply if it visibly breaks, and don't
  silently ignore the request either.
- The user iterates fast with concrete, specific feedback (often screenshots/images
  attached inline) rather than abstract direction — implement directly rather than
  asking clarifying questions for things a reference image already answers.
- The user actively tests changes in their own browser (Firefox) and reports back
  real symptoms (error messages, screenshots) — take those literally and diagnose
  the actual mechanism (e.g. "DNS could not be found" led straight to a real,
  previously-undetected bug) rather than assuming user error.
