# patrickontrack.nl

Hiking journal of Patrick van Dissel: stories from long-distance trails, the official routes and stages behind them, the places I slept and what I carried.

Built with [Hugo](https://gohugo.io) (no theme, everything lives in this repo), edited with [Pages CMS](https://pagescms.org), hosted on GitHub Pages.

## Run it locally

```sh
# Hugo extended, 0.146 or newer (built and tested with 0.169)
hugo server -D        # -D also shows drafts
```

Open http://localhost:1313. All migrated stories are still **drafts**, so without `-D` the site only shows the trails and pages.

## Content model

| Type | Folder | What it is | Links to |
|---|---|---|---|
| **Trail** | `content/trails/` | The official route: region, start/finish, website, cover | — |
| **Stage** (etappe) | `content/stages/` | One stage of a trail, with its own official GPX | trail |
| **Story** | `content/stories/` | One day on the trail (the blog post) | trail, stages walked, my GPX track, stays, gear list, YouTube |
| **Stay** | `content/stays/` | Campsite, hut, Nivon house…: type, price, facilities, coordinates | trail, stage |
| **Gear list** | `content/gear/` | Items with category, weight and base/worn/consumable | trail |

Links are stored as paths (`content/trails/dutch-mountain-trail.md`), which is what Pages CMS reference fields save. The reverse links are worked out by Hugo:

- a trail page lists its stages, the stories on it, the stays along it, and **how many stages I've hiked** (stages linked from published stories);
- a stage page shows who walked it (my stories) and stays near its end;
- a stay page shows the stories that spent the night there;
- a gear list shows which stories used it.

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
- [ ] Fill in the names of the DMT day 1 and day 2 campsites (`content/stays/farm-campsite-past-the-vaalserberg.md`, `campsite-noorbeek.md`).
- [ ] Add `lat`/`lon` to stays so they appear on the maps (none have coordinates yet).
- [ ] Section stubs for Veluwe Zwerfpad (8), Roots Natuurpad (5) and Utrechtse Mountain Trail (9) only have a number. Add names and GPX files when you have them.
- [ ] Set your YouTube channel URL in `hugo.toml` → `params.youtube`.
- [ ] Unmark **Draft** on the stories, stays and gear lists you want to publish.

## What was migrated from the old site

- All 16 posts from `content/en/adventures/` → `content/stories/`, **text untouched**. Kept: title, date, draft, description, series (`adventures` → `trips`). Converted: `trails` → `trail` reference and `tags: ["section N"]` → `stages` references. Each post has an `aliases` entry, so old `/adventures/…` URLs redirect.
- Dates used a `-02:00` offset. They now use the Dutch offset (`+02:00`/`+01:00`) with the same clock time.
- `<date>`-style notes in the drafts are escaped so they stay visible.
- DMT stories got structured extras taken from your own text: start/finish times, "the day in moments", where you slept and the gear list.
- Old taxonomy pages (adventures, trips, trails, tracks) are replaced by real trail/stage pages. `trips` remains as the series grouping.
- Old `trails/cover.jpg` and `feature.jpg` were duplicates of `images/dmt/20220909_082353.jpg` and were dropped.

## Project structure

```
.pages.yml                 Pages CMS: collections, fields, media
hugo.toml                  site config (menu, map tiles, permalinks, mounts)
assets/css/main.css        all styling (colours and fonts are custom properties at the top)
assets/css/fonts.css       self-hosted fonts (Barlow Condensed, Inter, IBM Plex Mono — OFL)
assets/js/main.js          mobile menu, filter chips, click-to-load YouTube
assets/js/map.js           Leaflet maps
layouts/                   templates (Hugo ≥0.146 layout structure)
  _partials/gpx/parse.html   GPX → distance, ascent, points, profile (build time)
  _partials/data/*.html      lookups: stats, trail stages/stories/stays, progress, gear totals, map data
  _partials/elevation.html   elevation profile as inline SVG
  _partials/trace.html       small route drawing used when a card has no photo
static/images/             photos (Pages CMS uploads here, Hugo resizes to WebP)
static/gpx/                GPX files
static/brand/              logo SVGs
```

## Design

Forest and ridge, minimal: fog `#F3F4EF`, ink `#18211C`, forest `#1E3D2F`, pine `#2F5D46` (official route), ember `#C8641E` (my track). Headings in Barlow Condensed, body in Inter, numbers in IBM Plex Mono. The logo is a ridge line with the walked trail dotted underneath, the same idea as the maps.

## Deploying

`.github/workflows/hugo.yml` builds with Hugo 0.169 extended on every push to `main` and deploys to GitHub Pages. In the repo settings, Pages → Source must be **GitHub Actions**. `static/CNAME` keeps the custom domain.

Privacy: no Google Fonts and no analytics. YouTube loads only after a click (youtube-nocookie). Only resized WebP copies of photos are published (no original files, so no EXIF/GPS data).
