#!/usr/bin/env python3
"""Generate a digital business card per employee from team/employees.json.

For each entry this writes:
    team/<slug>.html   the card (served at https://finasheet.com/team/<slug>)
    team/<slug>.vcf    the vCard the "Save contact" button downloads

Everything is self-contained: the QR code is generated as inline SVG, and a
missing photo falls back to an initials avatar. Fields left empty are omitted
from both the card and the vCard rather than rendered blank.

Usage:  python scripts/build-team-cards.py
Requires: pip install qrcode
"""
import io
import json
import os
import re
import sys

import qrcode
from qrcode.image.svg import SvgPathImage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://finasheet.com"
DATA = os.path.join(ROOT, "team", "employees.json")
OUT_DIR = os.path.join(ROOT, "team")

ICON = {
    "save": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.8 11.8 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.17 1.6 5.98L0 24l6.2-1.62A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22c-1.88 0-3.72-.5-5.33-1.46l-.38-.22-3.67.96.98-3.58-.25-.37A9.98 9.98 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm5.49-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.8.37c-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>',
    "call": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
}


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def initials(name):
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def qr_svg(url):
    q = qrcode.QRCode(border=0, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    buf = io.BytesIO()
    q.make_image(image_factory=SvgPathImage).save(buf)
    svg = buf.getvalue().decode("utf-8")
    svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
    # let CSS size it and colour the path
    svg = re.sub(r'\swidth="[^"]*"', "", svg, count=1)
    svg = re.sub(r'\sheight="[^"]*"', "", svg, count=1)
    return svg.strip()


def vcard(e, url):
    """vCard 3.0 - the widest-supported version on iOS and Android."""
    name = e["name"].strip()
    parts = re.split(r"\s+", name)
    first, last = (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (name, "")
    lines = ["BEGIN:VCARD", "VERSION:3.0",
             f"N:{last};{first};;;", f"FN:{name}"]
    if e.get("company"):
        lines.append(f"ORG:{e['company']}")
    if e.get("title"):
        lines.append(f"TITLE:{e['title']}")
    if e.get("phone"):
        lines.append(f"TEL;TYPE=CELL,VOICE:{e['phone']}")
    if e.get("email"):
        lines.append(f"EMAIL;TYPE=INTERNET,WORK:{e['email']}")
    lines += [f"URL:{url}", "END:VCARD"]
    return "\r\n".join(lines) + "\r\n"        # spec requires CRLF


def card_html(e, url):
    name, slug = e["name"].strip(), e["slug"]
    company = (e.get("company") or "Finasheet").strip()
    title = (e.get("title") or "").strip()
    desc = f"{name}{' - ' + title if title else ''}, {company}. Save contact, call, email or message on WhatsApp."

    if e.get("photo"):
        inner = f'<img src="/{esc(e["photo"])}" alt="{esc(name)}" width="104" height="104">'
    else:
        inner = f'<div class="initials" aria-hidden="true">{esc(initials(name))}</div>'
    avatar = f'<div class="portrait">{inner}</div>'

    # One primary action. Everything else is deliberately subordinate - the
    # Trust & Authority pattern calls for a single unmistakable CTA.
    primary = (f'<a class="act act-primary" href="{esc(slug)}.vcf" download="{esc(name)}.vcf">'
               f'{ICON["save"]}Save contact<span class="hint">vCard</span></a>')

    quick = []
    if e.get("whatsapp"):
        wa = re.sub(r"\D", "", e["whatsapp"])
        quick.append(f'<a class="act is-wa" href="https://wa.me/{wa}" target="_blank" rel="noopener" '
                     f'aria-label="Message {esc(name)} on WhatsApp">{ICON["wa"]}WhatsApp</a>')
    if e.get("phone"):
        quick.append(f'<a class="act" href="tel:{esc(e["phone"])}" '
                     f'aria-label="Call {esc(name)}">{ICON["call"]}Call</a>')
    if e.get("email"):
        quick.append(f'<a class="act" href="mailto:{esc(e["email"])}" '
                     f'aria-label="Email {esc(name)}">{ICON["mail"]}Email</a>')
    quick_html = f'<div class="quick">{"".join(quick)}</div>' if quick else ""

    tagline = f'<p class="tagline">{esc(e["tagline"])}</p>' if e.get("tagline") else ""
    role = f'<p class="role">{esc(title)}</p>' if title else ""
    org = f'<p class="org">{esc(company)}</p>'

    ld = {
        "@context": "https://schema.org", "@type": "Person",
        "name": name, "url": url,
        "worksFor": {"@type": "Organization", "name": company, "url": SITE + "/"},
    }
    if title:
        ld["jobTitle"] = title
    if e.get("email"):
        ld["email"] = e["email"]
    if e.get("phone"):
        ld["telephone"] = e["phone"]
    if e.get("photo"):
        ld["image"] = f"{SITE}/{e['photo']}"

    return f"""<!-- generated by scripts/build-team-cards.py - edit team/employees.json, not this file -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(name)}{' - ' + esc(title) if title else ''} | {esc(company)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{url}">

<meta property="og:type" content="profile">
<meta property="og:title" content="{esc(name)}{' - ' + esc(title) if title else ''}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="#172554">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/team-card.css">

<script type="application/ld+json">
{json.dumps(ld, indent=2)}
</script>

<main class="card">
  <header class="crest">
    <a class="brand" href="/" aria-label="{esc(company)} home">
      <img src="/assets/fina-logo-wordmark-white.webp" alt="{esc(company)}" width="320" height="96">
    </a>
    {avatar}
  </header>

  <div class="identity">
    <h1>{esc(name)}</h1>
    {role}
    {org}
    {tagline}
  </div>

  <div class="actions">
    {primary}
    {quick_html}
  </div>

  <section class="scan" aria-label="QR code for this card">
    <p class="scan-label">Scan to save</p>
    <div class="scan-frame">{qr_svg(url)}</div>
  </section>

  <footer class="foot"><a href="/">finasheet.com</a></footer>
</main>
"""


def main():
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    people = data.get("employees", [])
    if not people:
        print("no employees in team/employees.json"); return 1

    seen = set()
    for e in people:
        slug = e.get("slug", "").strip()
        if not slug or not e.get("name", "").strip():
            print(f"  SKIP  entry missing slug or name: {e}"); continue
        if slug in seen:
            print(f"  SKIP  duplicate slug '{slug}'"); continue
        seen.add(slug)

        url = f"{SITE}/team/{slug}"
        if e.get("photo"):
            p = os.path.join(ROOT, e["photo"])
            if not os.path.exists(p):
                print(f"  WARN  {slug}: photo not found at {e['photo']} - falling back to initials")
                e = {**e, "photo": ""}

        html_path = os.path.join(OUT_DIR, f"{slug}.html")
        vcf_path = os.path.join(OUT_DIR, f"{slug}.vcf")
        with open(html_path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(card_html(e, url))
        with open(vcf_path, "w", encoding="utf-8", newline="") as f:
            f.write(vcard(e, url))
        print(f"  OK    {slug:20s} -> team/{slug}.html + team/{slug}.vcf   ({url})")

    print(f"\n{len(seen)} card(s) generated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
