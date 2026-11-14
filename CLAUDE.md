# CLAUDE.md

Guidance for working in this repo (Sriram's personal/academic site).

## What this site is

A Jekyll site on the "academicpages" (Minimal Mistakes fork) theme, redesigned in
gwern.net's visual style. 

**gwern.net source**: Before assuming how a gwern feature works, sparse-clone his source
into the scratchpad and read it — don't guess from memory of the live site:
`git clone --depth 1 --filter=blob:none --sparse https://github.com/gwern/gwern.net.git gw && git -C gw sparse-checkout set css js build`.
Useful entry points: `css/initial.css` ("Fancy link underlining"), `css/links.css`
(link indicators, link icons), `js/extracts.js` + `js/extracts-*.js` (popup target
types), `build/` (Hakyll build, e.g. `LinkArchive.hs`, `Annotation/Arxiv.hs`).

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
- **Headless Firefox works** (`/usr/bin/firefox`, v159) — use it for visual
  verification instead of reasoning from compiled CSS. (Downloading a Chromium,
  e.g. Playwright's, does NOT work: large binary downloads get silently truncated
  in the sandbox, so `archive_pages.rb`'s headless Chrome is still CI-only.)
  Gotchas, all hit for real:
  - Always use a throwaway profile in the scratchpad (`--headless --no-remote
    --profile <dir>`) so it can't touch the user's running Firefox.
  - `jekyll build` bakes the production `url` into asset links, so a locally-built
    page silently loads the *live* site's CSS/JS. Build with
    `--config _config.yml,<file containing url: "">` for local screenshots.
  - Minimal Mistakes fades page content in with a CSS `intro` animation, and
    `--screenshot` fires before it runs → blank content area. Disable it in the
    throwaway profile: `toolkit.legacyUserProfileCustomizations.stylesheets` in
    `user.js` + `chrome/userContent.css` with `animation: none !important`.
  - `--screenshot` ignores `layout.css.devPixelsPerPx`; to inspect fine detail,
    crop and upscale with `magick ... -filter point -resize 800%`.
  - For computed styles/measurements, `--screenshot` can't run JS for you: serve
    a page that iframes the site and POSTs `getComputedStyle`/`getBoundingClientRect`
    results to a tiny local Python server, then exits. Same pattern renders
    three.js scenes frame-by-frame (`canvas.toDataURL()` right after `render()`)
    — that's how `images/vgp-orbit.gif` was made from the VGP project page's viewer.
  - To test phone behaviour (popovers.js's tap-to-preview path), make
    `(hover: none)` match with `user_pref("ui.primaryPointerCapabilities", 1)` and
    `ui.allPointerCapabilities` 1 in the profile's `user.js`, then dispatch clicks
    from the iframe harness. Use a *fresh* profile after rebuilding — a reused one
    served a stale cached `popovers.js` and made a working fix look broken.
- `jekyll serve --incremental` (how the user runs it) does **not** regenerate pages
  when `_data/*.json` changes. Every page embeds the popover data inline, so new
  hover metadata looks "broken" until the server is restarted — this was reported
  as missing previews several times in one session. Tell the user to restart
  without `--incremental` rather than debugging the links.

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
commit — `git pull`/`fetch` after a green run if you need what it generated.
`fetch_link_metadata.rb` is plain HTTP and **can** be run locally
(`/usr/bin/ruby-2.7 -S bundle exec ruby-2.7 _scripts/fetch_link_metadata.rb`;
incremental, only fetches URLs not already cached) — do that after adding links so
the user's local preview works immediately. Page snapshots (`archive_pages.rb`,
headless Chrome) still only exist after a live CI run. The commit-back step uses
`git status --porcelain` (not `git diff`, which ignores new untracked files - that
bug meant snapshots were never committed, only rebuilt every deploy).

The script scans `CONTENT_DIRS` (markdown links + `href=`), publication front
matter (bare `paperurl:`/`code:`/`website:` URLs), and `EXTRA_CONTENT_FILES`
(`quotes.js`, which renders links but lives at the repo root). If a link "has no
preview", first check it's actually being collected - three separate gaps like this
were found. `frameable?()` judges a whole host by its root page, following redirects
(it used to read the redirect response itself, which never carries
`X-Frame-Options`, so redirecting hosts were always marked embeddable - an audit
flipped 4 wrong entries). Known remaining gaps: it's host-level, so one page on a
host can block framing while the root doesn't; and it only checks headers, so a host
serving an error page (e.g. a GitHub Pages 404 while a co-author's site is down) is
recorded as embeddable and the popover shows that error page until the site returns.

## Design direction

- **Light mode only** — no dark mode toggle, no dark-mode CSS.
- Typography: Source Serif 4 (body/headings) / Source Sans 3 (nav/UI chrome) /
  IBM Plex Mono (code), loaded via Google Fonts.
- **Links are grayscale** (`$link-color: #333`, hover `#888`, visited `#666`,
  matching gwern's actual `--GW-body-link-*` palette), underlined by default
  (not just on hover — grayscale text needs the underline for contrast against
  body copy). A blue/no-default-underline variant was tried and explicitly
  reverted — don't reintroduce it without being asked again.
- **The underline is gwern's background-gradient technique, not `text-decoration`**
  (`.page__content a` in `_sass/_page.scss`, ported from gwern's `css/initial.css`):
  a 1px `linear-gradient` at `background-position: 0 calc(100% - 0.1em)`, plus
  text-shadows in `--link-underline-background-color` that carve gaps around
  descenders. Don't "simplify" it back to `text-decoration` — the indicator hook
  below is drawn with the identical position expression so the two meet in a clean
  corner; text-decoration's position comes from font metrics and can't be matched.
  Consequences: any container inside `.page__content` with a non-white background
  must set `--link-underline-background-color` to that background (`.quote-box`
  does) or the cut-outs show as white halos; `a code` drops its background box
  (it would paint over the underline); footnote refs opt out with
  `background-image: none; text-shadow: none`.
- **Link indicators** (gwern's "pop-frame indicators", `css/links.css`) — set by
  `classify()` in `assets/js/popovers.js`, styled at the bottom of
  `_sass/_popovers.scss`. Mutually exclusive, exactly like gwern's (his
  `Extracts.targetTypeInfo` returns ONE type per link — verified in source):
  - **"L" indicator hook** (`a.has-indicator-hook` + an injected empty
    `span.indicator-hook`; gwern's `has-content`): popover shows the content itself
    — internal page excerpt, local archive, or live iframe.
  - **Dotted underline** (`a.has-annotation`): popover shows a build-time
    annotation instead — arXiv abstract or scraped metadata card.
  - **Plain solid underline**: nothing useful to preview (openreview, LinkedIn).
  For external links, `externalMode()` is the single source of truth for both the
  popover content and the indicator — add a new popover source there, not in
  `externalHandler`/`classify` separately, or the indicator will lie. The hook only
  goes on links inside `.page__content` that have visible text (not image-only
  links), and a U+2060 WORD JOINER is prepended to the link's first text node so the
  tick can't wrap away from the first word (gwern's trick — it must go into the
  existing text node, not a new one). Archive-layout pages (publications, mlmonad)
  have no `.page__content`, so their links keep the plain `.archive a` underline
  and get no indicators.
  - Drop-cap gotcha, currently latent: no page opens its drop-cap paragraph with a
    link. If one ever does, the hook span + U+2060 sit exactly where `::first-letter`
    looks — check it in Firefox before shipping.
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
- **About-page quotes** live in `quotes.js` at the repo root (not `assets/js/`).
  Attribution style is a deliberate per-quote choice, not a uniform rule: fictional
  speakers are credited as the character plus the work, with no author (`Dalinar
  Kholin, <em>Oathbringer</em>`, `Oikawa Tōru, <em>Haikyū!!</em>`); everything else
  is author plus work; no translator credits; the Blue Lantern oath is just "Blue
  Lantern Oath". Book titles go in `<em>` (the cite line is `font-style: normal`),
  poems/stories in curly quotes, scripture as plain citation (`Bhagavad Gita 2.47`).

## Popovers (`assets/js/popovers.js`, `_sass/_popovers.scss`)

A from-scratch, small vanilla-JS engine inspired by gwern's `Popups`/`Extracts`
architecture, not vendored from gwern.net directly (that code is ~5000+ lines
tightly coupled to Hakyll's build and a curated annotation database this site
doesn't have). Binds to `.page__content a[href]` (or `.archive a[href]` on
archive-layout pages like publications, which have no `.page__content`) and
`.author__urls a[href]` (sidebar social icons) — extend that selector, don't bind
`a[href]` site-wide. It used to fall back to `document.body` on archive pages,
which put popovers on the masthead nav (Home/Publications/Blog) — reported and
fixed; never fall back to body.
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
