# Arcus Design Build — website

Static site for Arcus Design Build (ADB), Noida. No build step: plain HTML, CSS and JavaScript.

- `index.html` — home (hero, services, featured work, process, team, contact)
- `work.html` — full portfolio with filters; each project opens in a modal with a lightbox
- `assets/js/projects.js` — all project data (titles, locations, descriptions, image lists). Edit this file to change portfolio text.
- `assets/img/work/<slug>/` — project images (`cover.jpg` plus numbered views)

## Editing

- Contact details live in `index.html`, `work.html` (menu, contact section, footer, mobile bar).
- To add a project: drop images into `assets/img/work/<new-slug>/`, then add an entry to `assets/js/projects.js` with `cover` and `images` (`src`, `w`, `h`).

## Hosting

Designed for GitHub Pages: Settings → Pages → Deploy from branch `main`, folder `/ (root)`.

## Cache busting

Asset links carry a `?v=` version. After changing CSS or JS, run:

```bash
python3 -c "import re,time;v=time.strftime('%Y%m%d%H%M');[open(f,'w').write(re.sub(r'(assets/(?:css|js)/[\\w-]+\\.(?:css|js))(\\?v=\\d+)?', r'\\1?v='+v, open(f).read())) for f in ['index.html','work.html','case-studies.html']]"
```
