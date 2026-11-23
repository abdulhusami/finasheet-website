# Shared header and footer

Every page shows the same header and footer from these files:

- `site-header.html` – the header (logo, menu, WhatsApp and "Free Books Status Check" buttons, mobile menu)
- `site-footer.html` – the footer
- `site-head.html`   – loads the fonts, `/assets/site-chrome.css` and `/assets/site-chrome.js`

Change one of these files and push to `main`; GitHub Pages rebuilds the site and
every page picks up the change. Styles live in `/assets/site-chrome.css`
(classes start with `sh-` for the header and `sf-` for the footer). If you change
the CSS or JS, bump the `?v=` number in `site-head.html` so browsers fetch the new file.

How it works: each page starts with an empty front matter block (`---` / `---`),
which tells GitHub Pages (Jekyll) to process it, and contains
`{% include site-header.html %}` / `{% include site-footer.html %}`.
New pages need the same three things: the front matter, `{% include site-head.html %}`
before `</head>`, and the header/footer include lines.
