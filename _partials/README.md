# Phase 1 shared chrome

The `_partials/` directory contains internal templates for future page
migrations. Its leading underscore keeps GitHub Pages from publishing it as
ordinary site content. No existing HTML page loads these partials yet.
`assets/finasheet.css` uses `fs-` class names and an
opt-in `body.fs-site` base so it does not restyle current live pages.

An opted-in UTF-8 HTML source keeps its own title, description, canonical,
schema, copy, and page-specific assets. Give its body `class="fs-site"`, its
main content `id="main"`, and place each marker exactly once:

```html
<head>
  <!-- page-specific SEO metadata -->
  <!-- fs:head -->
</head>
<body class="fs-site">
  <!-- fs:body-tracking -->
  <!-- fs:header -->
  <main id="main"><!-- page content --></main>
  <!-- fs:footer -->
  <!-- fs:mobile-cta -->
</body>
```

Build a future page with the templates in `_partials/`:

```sh
python3 scripts/build-site.py --input path/to/page-source.html --output path/to/public-page.html
python3 scripts/build-site.py --input path/to/page-source.html --output path/to/public-page.html --check
```

The script only reads the named source and writes the named output. It requires
different paths and does not discover or migrate live pages. The `--check`
command writes nothing. Rebuilding unchanged input produces identical output.
If the source already has all three Phase 0 GTM/Meta tracking blocks, the
script preserves them; otherwise it inserts the exact snippets from
`scripts/site_tracking.py`. An incomplete set is an error. The head partial
contains font `<link>` tags and shared CSS/JS, with no SEO metadata.

Navigation currently points Software to `/`, where the software homepage
already lives; About to `/our-team`; and Contact to the existing homepage
`#contact` section. Update those destinations when their future pages exist.
The shared CTA hooks push `finasheet_cta_click` into `dataLayer` for elements
with `data-fs-cta`. Before migrating a current page, audit its existing CTA
events and GTM configuration to avoid duplicate conversion events.
