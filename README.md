# patrickontrack.nl

Hiking journal of Patrick van Dissel: stories from long-distance trails, the official routes and stages behind them, the places I slept and what I carried.

Built with [Hugo](https://gohugo.io) (no theme, everything lives in this repo), edited with [Pages CMS](https://pagescms.org), hosted on GitHub Pages.

## Run it locally

```sh
./hugow server -D     # preview with drafts: http://localhost:1313/en/ and /nl/
./hugow               # build into public/
```

`./hugow` is a small wrapper that runs the Hugo version pinned in **`.hugo-version`**. That is the only place the version is set: the GitHub workflow builds with `./hugow` too, so your machine and the live site always use the same Hugo. The first run downloads that release from GitHub into `.hugo/` (git-ignored), after checking its SHA-256 against Hugo's published checksums.

| Command | What it does |
|---|---|
| `./hugow <anything>` | runs Hugo with those arguments |
| `./hugow --hugow-version` | shows the pinned version |
| `./hugow --hugow-update` | pins the latest Hugo release and downloads it |
| `./hugow --hugow-update 0.170.0` | pins a specific version |
| `./hugow --hugow-clean` | deletes the downloaded binaries |

It works on Linux, macOS (Intel and Apple silicon) and Windows via Git Bash or WSL, and needs `curl` (or `wget`) plus `sha256sum` (or `shasum`). After `--hugow-update`, commit `.hugo-version`: the next deploy uses the new version. `hugo.toml` also sets a minimum (`module.hugoVersion`), so a too-old system `hugo` gives a clear error instead of a broken site.

All migrated stories are still **drafts**, so without `-D` the site only shows the trails and pages.

## Two languages

The site is in **English** (`/en/`) and **Dutch** (`/nl/`).

**Which language a visitor gets**
1. If they clicked **NL/EN** in the header (or a banner button) before, that choice wins. It is stored in the browser (`localStorage`, key `pot-lang`).
2. Otherwise `/` sends them to the first of their browser languages the site supports; anything else (e.g. German) gets English. This is done in JavaScript by `layouts/alias.html`, because GitHub Pages can’t read the `Accept-Language` header.
3. Deeper pages are never redirected (shared links and Google always get the page they asked for). If the browser language differs and no choice was made, a small banner offers the page in the other language: “Deze pagina is ook in het Nederlands beschikbaar.” Both of its buttons save a choice.

**Old links keep working.** GitHub Pages serves `/404.html` for every missing path. That page (`layouts/root404.html`) sends paths without a language prefix, like `/adventures/2022-09-dmt/2022-09-dmt-day-1/` or `/trails/dmt/`, to the same path under the visitor’s language, where Hugo has the redirects (`aliases`). A real “not found” is shown in the language of the URL.

- **Dutch is the main language.** `content/nl/…` holds every page with all its data: GPX files, numbers, links between pages, photos, coordinates, dates and draft status.
- **English only holds text.** `translations/en/…` has the English title, summary, body and other text fields of a page, plus `of:` pointing at the Dutch page it translates. At build time `content/en/_content.gotmpl` creates each English page from the Dutch page plus its English text. Data can't drift between the languages, because it only exists once.
- Lists with text and data (gear items, moments, “good to know”) are merged item by item: the English list holds names/notes in the same order, and weights, times and icons come from the Dutch list.
- **A page without an English translation still appears on the English site**, in Dutch, with a short note (“This page is only available in Dutch”), a language badge on cards and a canonical link to the Dutch original. Your stories work like this: to translate one, add an English translation in Pages CMS and pick the story under “Translation of”.
- Pages that exist only in English aren’t supported; create the Dutch page first.
- Interface text (menus, labels, buttons) is in `i18n/en.yaml` and `i18n/nl.yaml`. Dates and numbers follow the language (`za 10 sep 2022`, `29,6 km`).
- Values chosen from a list in the CMS (stay type, gear category, route type) are stored in English and translated on the page.
- In Pages CMS, **Nederlands** has all fields. **English (translations)** only shows text fields and a “Translation of” picker. To change the CMS fields, edit `scripts/pages.base.yml` and run `python3 scripts/pages-config.py`. The list of text fields is `TEXT` at the top of that script.
- Visitors whose browser language is neither Dutch nor English get `defaultContentLanguage` (English) in `hugo.toml`.
- Texts shown before the language is known (root page, 404, banner) are in `data/languages.yaml`.

## Testing

```sh
./scripts/test quick   # ~2 s: builds + content checks + link check on your real content
./scripts/test         # everything: quick + browser tests + accessibility scan (~30 s)
```

You don't need to install Node yourself. `./nodew` works like `./hugow`: it runs the Node version pinned in **`.node-version`**. On first use it downloads that release from nodejs.org into `.node/` (git-ignored), after checking its SHA-256 against Node's published checksums. npm and npx come with it. The first browser test run also installs the test tools (`npm ci` and Playwright's Chromium) by itself. If a test fails, `./nodew npx playwright show-report` shows what happened, with a screenshot and a step-by-step trace.

| Command | What it does |
|---|---|
| `./nodew npm …`, `./nodew npx …`, `./nodew node …` | runs npm, npx or node with the pinned Node |
| `./nodew --nodew-version` | shows the pinned version |
| `./nodew --nodew-update` | pins the latest LTS release and downloads it |
| `./nodew --nodew-update 26.14.0` | pins a specific version |
| `./nodew --nodew-clean` | deletes the downloaded Node versions |

GitHub uses `./nodew` too, so after `--nodew-update`, commit `.node-version`.

| Layer | What it catches | Where |
|---|---|---|
| **Build checks** | template errors, missing interface translations, any Hugo warning. The test builds use `--panicOnWarning`, so every warning fails them | `scripts/test` |
| **Content checks** | a link to a trail, stage, stay, gear list or trip that doesn’t exist (or is still a draft), a missing or empty GPX file, two stages with the same number, an English translation of a page that doesn’t exist, an English list with more items than the Dutch one | `layouts/_partials/checks/content.html`, `content/en/_content.gotmpl`. They also run in `./hugow server`, where they show up as warnings |
| **Link check** | broken internal links, images, GPX downloads and redirects; i18n files with different keys | `tests/links.mjs` |
| **Browser tests** | light/dark theme (system default, a choice that sticks, no flash, maps follow, light print); language choice at `/`, saved choice, banner, old links, 404 in both languages; filters; maps, “Show my tracks”, the mobile menu; translated vs untranslated pages; number and date formats; trip totals; drafts not published; no JavaScript errors; no sideways scrolling on a phone; every image has alt text and every link/button a name | `tests/e2e/*.spec.mjs` |
| **Accessibility scan** | WCAG 2.0, 2.1 and 2.2 (A and AA) plus axe's best practices, on a desktop and a phone screen, in the light and the dark theme: contrast, names and labels, heading order, landmarks, keyboard access to scrolling areas, touch target size (also of map markers). Any problem fails it, whatever its impact | `tests/e2e/a11y.spec.mjs` |

**Test content.** The browser tests run on a small fixed site in `tests/fixtures/`, not on your real content, so they don’t break when you add stories. `scripts/test` builds it with the real templates, styles and config. If you add a feature, add an example of it there and a test in `tests/e2e/`.

**On GitHub** (`.github/workflows/hugo.yml`), every push and pull request runs the tests. A push to `main` is only built and deployed when they pass, so a broken commit (also one from Pages CMS) never reaches the live site. The test report is attached to every run, under *Artifacts*.

`package.json` is only there for the test tools. Commit the `package-lock.json` that `./nodew npm install` creates, so GitHub uses exactly the same versions.

## Content model

| Type | Folder | What it is | Links to |
|---|---|---|---|
| **Trail** | `content/nl/trails/` | The official route: region, start/finish, website, cover | — |
| **Stage** (etappe) | `content/nl/stages/` | One stage of a trail, with its own official GPX | trail |
| **Trip** | `content/nl/trips/` | One outing of one or more days, e.g. “Dutch Mountain Trail in 3 days”: intro, cover, gear list, the run-up | main trail, gear list, earlier trips (run-up) |
| **Story** | `content/nl/stories/` | One day on the trail (the blog post) | trip, trail, stages walked, my GPX track, stays, YouTube (and a gear list if it differs from the trip’s) |
| **Stay** | `content/nl/stays/` | Campsite, hut, Nivon house…: type, price, facilities, coordinates | trail, stage |
| **Gear list** | `content/nl/gear/` | Items with category, weight and base/worn/consumable | trail |

Links are stored as paths (`content/nl/trails/dutch-mountain-trail.md`), which is what Pages CMS reference fields save. On the English site the same link leads to the English page. The reverse links are worked out by Hugo:

- a trail page lists its stages, the stories on it, the stays along it, and **how many stages I've hiked** (stages linked from published stories);
- a stage page shows who walked it (my stories) and stays near its end;
- a stay page shows the stories that spent the night there;
- a gear list shows which stories used it (directly or through their trip);
- a trip page adds up its stories: dates, days, nights, distance and ascent. It shows every day’s track on one map, in alternating shades, plus one elevation profile, a day-by-day list, the stays, the gear list with “next time”, and earlier trips under “The run-up”.

The Stories page has an **All stories / By trip** switch; `/trips/` lists every trip with at least one published story. Trips replace the old `trips` taxonomy.

### GPX files → maps, numbers and elevation profiles

Upload GPX files in Pages CMS (they go to `static/gpx/`). At build time Hugo reads them and calculates distance, ascent and descent, start/finish time and the elevation profile. **You never type those numbers**, but any `distance_km`, `ascent_m`, `descent_m`, `start_time` or `end_time` you set in front matter wins over the GPX.

- Stage → `gpx`: the **official** route of that stage (green dashed on the map).
- Story → `track`: what **I actually walked** (orange). The story map shows the official stages I walked, the rest of the trail faded, my track and where I slept.
- Trail → totals are the sum of its stages unless `distance_km`/`ascent_m` are set (the DMT uses 101 km / 2000 m).

Maps use [Leaflet](https://leafletjs.com) (bundled in `assets/vendor/`, no CDN) with OpenTopoMap tiles. Swap the tile server in `hugo.toml` → `params.map`.

### Sample data to replace

Everything under `static/gpx/samples/` is **made-up GPX** so the maps have something to draw. Pages using it show a yellow "Sample GPX" note.

- [ ] Replace `dmt-stage-1..4.gpx` with the official DMT stage files and check the stage names (**stages 1 and 2 especially: Eygelshoven → Vaals → Gulpen is a guess**).
- [ ] Replace `dmt-2022-day-1..3.gpx` with your own recorded tracks from September 2022.
- [ ] Delete `static/gpx/samples/` when done.
- [ ] Fill in the names of the DMT day 1 and day 2 campsites (`content/nl/stays/farm-campsite-past-the-vaalserberg.md`, `campsite-noorbeek.md`; the English text is in `translations/en/stays/`).
- [ ] Add `lat`/`lon` to stays so they appear on the maps (none have coordinates yet).
- [ ] Section stubs for Veluwe Zwerfpad (8), Roots Natuurpad (5) and Utrechtse Mountain Trail (9) only have a number. Add names and GPX files when you have them.
- [ ] Set your YouTube channel URL in `hugo.toml` → `params.youtube`.
- [ ] Unmark **Draft** on the stories, stays and gear lists you want to publish.

## What was migrated from the old site

- All 16 posts from `content/en/adventures/` → `content/nl/stories/` (they are written in Dutch), **text untouched**. Kept: title, date, draft, description, series (`adventures` → `trips`). Converted: `trails` → `trail` reference and `tags: ["section N"]` → `stages` references. Each post has an `aliases` entry, so old `/adventures/…` URLs redirect.
- Dates used a `-02:00` offset. They now use the Dutch offset (`+02:00`/`+01:00`) with the same clock time.
- `<date>`-style notes in the drafts are escaped so they stay visible.
- DMT stories got structured extras taken from your own text: start/finish times, "the day in moments", where you slept and the gear list.
- Old taxonomy pages (adventures, trips, trails, tracks) are replaced by real trail/stage pages. `trips` remains as the series grouping.
- Old `trails/cover.jpg` and `feature.jpg` were duplicates of `images/dmt/20220909_082353.jpg` and were dropped.

## Project structure

```
hugow                      Hugo wrapper (runs the version in .hugo-version)
.hugo-version              the one place the Hugo version is pinned
nodew                      Node wrapper for the test tools (runs the version in .node-version)
.node-version              the one place the Node version is pinned
.pages.yml                 Pages CMS config (generated, see scripts/)
scripts/pages.base.yml     Pages CMS fields, written once for both languages
scripts/pages-config.py    expands the base into .pages.yml (nl + en)
hugo.toml                  site config (languages, menus, map tiles, permalinks, mounts)
i18n/en.yaml, i18n/nl.yaml interface text
content/nl                 all content (Dutch, the main language)
translations/en            English text for those pages
content/en/_content.gotmpl builds the English pages from the two
assets/css/main.css        all styling (colours and fonts are custom properties at the top)
assets/css/fonts.css       self-hosted fonts (Barlow Condensed, Inter, IBM Plex Mono — OFL)
assets/js/main.js          mobile menu, filter chips, click-to-load YouTube
assets/js/map.js           Leaflet maps
scripts/test               runs the tests (quick, e2e, a11y)
tests/                     link checker, test server, browser tests (e2e/), fixed test content (fixtures/)
package.json               test tools only (Playwright, axe)
layouts/                   templates (Hugo ≥0.146 layout structure)
  _partials/gpx/parse.html   GPX → distance, ascent, points, profile (build time)
  _partials/data/*.html      lookups: stats, trail stages/stories/stays, progress, gear totals, map data
  _partials/elevation.html   elevation profile as inline SVG
  _partials/trace.html       small route drawing used when a card has no photo
  _partials/lang/            language switch, "only available in …" note, fallback detection
static/images/             photos (Pages CMS uploads here, Hugo resizes to WebP)
static/gpx/                GPX files
static/brand/              logo SVGs
```

## Design

Forest and ridge, minimal: fog `#F3F4EF`, ink `#18211C`, forest `#1E3D2F`, pine `#2F5D46` (official route), ember `#C8641E` (my track). Headings in Barlow Condensed, body in Inter, numbers in IBM Plex Mono. The logo is a ridge line with the walked trail dotted underneath, the same idea as the maps.

## Deploying

`.github/workflows/hugo.yml` builds with `./hugow` (so with the Hugo version in `.hugo-version`) on every push to `main` and deploys to GitHub Pages. In the repo settings, Pages → Source must be **GitHub Actions**. `static/CNAME` keeps the custom domain.

Light and dark theme: the site follows the visitor's system setting, and the switch in the header (Auto / Light / Dark) lets them pick one, remembered in their browser. Every colour is a custom property at the top of `assets/css/main.css`, with its dark value in the `[data-theme="dark"]` block right below it: change both together. Maps are the exception: they look the same in both themes (dark map tiles were too hard to read), so the map tokens (`--route-*`) have no dark value, while route drawings, elevation profiles and gear weights use the theme-aware `--draw-*` tokens. The script that picks the theme before the page is drawn is `layouts/_partials/theme/init.js.html`. Printouts are always light. The accessibility scan checks every page in both themes.

Privacy: no Google Fonts and no analytics. YouTube loads only after a click (youtube-nocookie). Only resized WebP copies of photos are published (no original files, so no EXIF/GPS data).
