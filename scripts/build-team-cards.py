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
    "web": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    "share": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "qr": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4"/></svg>',
    "download": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
}


def pretty_phone(raw):
    """+971542922850 -> +971 54 292 2850. Anything unrecognised is left alone."""
    digits = re.sub(r"\D", "", raw or "")
    if raw.startswith("+971") and len(digits) == 12:
        d = digits[3:]
        return f"+971 {d[:2]} {d[2:5]} {d[5:]}"
    return raw


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
    company = (e.get("company") or "Finasheet LLC").strip()
    title = (e.get("title") or "").strip()
    desc = f"{name}{' - ' + title if title else ''}, {company}. Save contact, call, email or message on WhatsApp."

    # Full-bleed portrait. "face" is where build-team-photos.py put the eye line;
    # the CSS anchors object-position on the same number so the framing holds at
    # any panel height. Falls back to the square crop, then to initials.
    hero = e.get("hero") or e.get("photo")
    face = e.get("face", 30)
    if hero:
        portrait = (f'<img class="portrait-img" style="--face:{face}%" src="/{esc(hero)}" '
                    f'alt="{esc(name)}, {esc(title) if title else esc(company)}" '
                    f'width="800" height="1000">')
    else:
        portrait = (f'<div class="portrait-fallback" aria-hidden="true">'
                    f'{esc(initials(name))}</div>')

    # One row per real value. The row itself is the action - no separate icon
    # grid duplicating call/email a second time.
    lines = []
    if e.get("phone"):
        wa_btn = ""
        if e.get("whatsapp"):
            wa = re.sub(r"\D", "", e["whatsapp"])
            wa_btn = (f'<a class="wa" href="https://wa.me/{wa}" target="_blank" rel="noopener" '
                      f'aria-label="Message {esc(name)} on WhatsApp">{ICON["wa"]}</a>')
        lines.append(
            f'<div class="line">'
            f'<a class="row" href="tel:{esc(e["phone"])}" aria-label="Call {esc(name)}">'
            f'<span class="ic">{ICON["call"]}</span>'
            f'<span class="txt"><span class="lbl">Mobile</span>'
            f'<span class="val num">{esc(pretty_phone(e["phone"]))}</span></span></a>'
            f'{wa_btn}</div>')
    if e.get("email"):
        lines.append(
            f'<div class="line">'
            f'<a class="row" href="mailto:{esc(e["email"])}" aria-label="Email {esc(name)}">'
            f'<span class="ic">{ICON["mail"]}</span>'
            f'<span class="txt"><span class="lbl">Email</span>'
            f'<span class="val">{esc(e["email"])}</span></span></a></div>')
    lines_html = f'<div class="rows">{"".join(lines)}</div>' if lines else ""

    role = f'<p class="role">{esc(title)}</p>' if title else ""
    # already-escaped fragment: interpolated raw so the separator entity survives
    org = esc(company) + (f' &middot; {esc(e["location"])}' if e.get("location") else "")

    # Per-person link preview from scripts/build-team-photos.py. Falls back to
    # the site banner, which is what every card used to share - so a card sent
    # on WhatsApp previewed as an advert for the product rather than the person.
    og_rel = f"assets/team/{slug}-og.jpg"
    og_img = (f"{SITE}/{og_rel}" if os.path.exists(os.path.join(ROOT, og_rel))
              else f"{SITE}/assets/og-image.png")
    og_alt = f"{name}{' - ' + title if title else ''}, {company}"

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
<meta property="og:site_name" content="{esc(company)}">
<meta property="og:title" content="{esc(name)}{' - ' + esc(title) if title else ''}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(og_alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{og_img}">

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
  <div class="portrait">
    {portrait}
    <a class="brand" href="/" aria-label="{esc(company)}">
      <img src="/assets/fina-logo.webp" alt="{esc(company)}" width="320" height="96">
    </a>
  </div>

  <div class="identity">
    <h1>{esc(name)}</h1>
    {role}
    <p class="org">{org}</p>
  </div>

  <div class="actions">
    <a class="save" href="{esc(slug)}.vcf" download="{esc(name)}.vcf">
      {ICON["download"]}<span>Save contact</span>
    </a>
    {lines_html}
  </div>

  <div class="foot">
    <a class="ghost" href="/">{ICON["web"]}<span>finasheet.com</span></a>
    <button class="ghost" type="button" data-qr aria-haspopup="dialog">{ICON["qr"]}<span>QR code</span></button>
    <button class="ghost" type="button" data-share data-share-url="{url}" data-share-title="{esc(name)} - {esc(company)}">
      {ICON["share"]}<span>Share</span>
    </button>
  </div>
</main>

<dialog class="qr-modal" aria-label="QR code for this card">
  <div class="qr-panel">
    <div class="qr">{qr_svg(url)}</div>
    <p class="qr-name">{esc(name)}</p>
    <p class="qr-hint">Point a camera here to open this card</p>
    <button class="qr-close" type="button">Done</button>
  </div>
</dialog>

<script>
(function(){{
  var dlg=document.querySelector('.qr-modal');
  var qrBtn=document.querySelector('[data-qr]');
  if(dlg&&qrBtn&&typeof dlg.showModal==='function'){{
    qrBtn.addEventListener('click',function(){{dlg.showModal();}});
    dlg.querySelector('.qr-close').addEventListener('click',function(){{dlg.close();}});
    /* clicking the backdrop closes it - the panel stops the event */
    dlg.addEventListener('click',function(ev){{if(ev.target===dlg)dlg.close();}});
  }} else if(qrBtn){{
    qrBtn.hidden=true;              /* no dialog support: do not offer a dead button */
  }}

  var b=document.querySelector('[data-share]');
  if(!b) return;
  var label=b.querySelector('span');
  b.addEventListener('click',function(){{
    var url=b.dataset.shareUrl, title=b.dataset.shareTitle;
    if(navigator.share){{ navigator.share({{title:title,url:url}}).catch(function(){{}}); return; }}
    if(navigator.clipboard){{
      navigator.clipboard.writeText(url).then(function(){{
        var was=label.textContent; label.textContent='Copied';
        setTimeout(function(){{label.textContent=was;}},2000);
      }});
    }}
  }});
}})();
</script>
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
