"""Cut the card portrait from each original headshot, and build its link preview.

The card's photo panel changes height with the screen, so the crop has to be
chosen such that it composes at ANY height. With object-fit:cover, a point at
fraction f of the source lands at fraction f of the box precisely when
object-position is set to that same f - and at no other value does it stay put
as the box resizes.

So the rule is: cut every portrait so the eye line sits at EYE_LINE of the
frame, and let the CSS anchor on the same number. The eyes then sit at that
fraction of the panel on a tall phone and a short one alike. Everything else -
how much shoulder is visible - varies, which is what you want it to do.

Originals in assets/team/originals/ are the archive and are never modified.

  python scripts/build-team-photos.py        (needs Pillow)
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EYE_LINE = 0.30      # where the eyes sit in the output, and in the CSS anchor
RATIO = 0.8          # 4:5 portrait
OUT_W = 800

# slug -> (face centre x, eye line y) measured in the original
FACE = {
    "buhari-anshif": (555, 271),
    "sradha-santhosh": (575, 277),
    "moiz-fakhruddin": (398, 292),
}

# Link preview. 1200x630 is what WhatsApp, iMessage, Slack and LinkedIn expect,
# and the page declares these exact numbers so a client never has to download
# the file to find out how to lay the card out.
OG_W, OG_H = 1200, 630
OG_PHOTO_W = 470
NAVY, NAVY_LIFT = (15, 54, 93), (28, 102, 176)

FONTS = {
    "bold": "C:/Windows/Fonts/segoeuib.ttf",
    "semi": "C:/Windows/Fonts/seguisb.ttf",
    "reg": "C:/Windows/Fonts/segoeui.ttf",
}


def font(kind, size):
    try:
        return ImageFont.truetype(FONTS[kind], size)
    except OSError:
        return ImageFont.load_default()


def fitted(draw, text, kind, size, max_w, floor=22):
    """Largest size at or below `size` that keeps `text` inside max_w."""
    while size > floor:
        f = font(kind, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(kind, floor)


def og_card(hero_path, name, title, org, dest):
    img = Image.new("RGB", (OG_W, OG_H), NAVY)

    # brand wash, lighter towards the right so the text side has some depth
    grad = Image.new("RGB", (OG_W, 1))
    gd = ImageDraw.Draw(grad)
    for x in range(OG_W):
        t = x / (OG_W - 1)
        gd.point((x, 0), tuple(round(NAVY[i] + (NAVY_LIFT[i] - NAVY[i]) * t) for i in range(3)))
    img.paste(grad.resize((OG_W, OG_H)), (0, 0))

    # portrait panel, cover-cropped: same framing rule as the card
    photo = Image.open(hero_path).convert("RGB")
    sw, sh = photo.size
    scale = max(OG_PHOTO_W / sw, OG_H / sh)
    photo = photo.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    left = (photo.width - OG_PHOTO_W) // 2
    top = max(0, min(photo.height - OG_H, round(EYE_LINE * photo.height - EYE_LINE * OG_H)))
    img.paste(photo.crop((left, top, left + OG_PHOTO_W, top + OG_H)), (0, 0))

    d = ImageDraw.Draw(img)
    d.rectangle([OG_PHOTO_W, 0, OG_PHOTO_W + 3, OG_H], fill=(255, 255, 255))

    x = OG_PHOTO_W + 62
    max_w = OG_W - x - 62

    logo = Image.open(os.path.join(ROOT, "assets/fina-logo-wordmark-white.png")).convert("RGBA")
    lh = 46
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    img.paste(logo, (x, 74), logo)

    f_name = fitted(d, name, "bold", 62, max_w, floor=38)
    f_title = fitted(d, title, "semi", 30, max_w, floor=20)
    f_org = fitted(d, org, "reg", 25, max_w, floor=18)

    y = 232
    d.text((x, y), name, font=f_name, fill=(255, 255, 255))
    y += f_name.getbbox(name)[3] + 22
    d.text((x, y), title, font=f_title, fill=(158, 196, 235))
    y += f_title.getbbox(title)[3] + 14
    d.text((x, y), org, font=f_org, fill=(176, 199, 224))

    # site pill
    f_pill = font("semi", 24)
    label = "finasheet.com"
    tw = d.textlength(label, font=f_pill)
    px, py, pad = x, 508, 20
    d.rounded_rectangle([px, py, px + tw + pad * 2, py + 52], radius=26,
                        fill=(255, 255, 255, 255))
    d.text((px + pad, py + 12), label, font=f_pill, fill=NAVY)

    img.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
    return os.path.getsize(dest)


def main():
    os.chdir(ROOT)
    with open("team/employees.json", encoding="utf-8") as f:
        people = {e["slug"]: e for e in json.load(f).get("employees", [])}

    for slug, (face_x, eye_y) in FACE.items():
        src = f"assets/team/originals/{slug}.jpg"
        im = Image.open(src).convert("RGB")
        w, h = im.size

        # Tallest crop satisfying (eye_y - top)/ch == EYE_LINE while staying
        # inside the frame. Bounded three ways: the headroom above the eyes,
        # the frame remaining below them, and the width a 4:5 crop needs.
        # The middle bound matters - a portrait shot tight under the chin has
        # plenty of headroom but nothing below, and without it the eye line
        # silently lands wherever it happens to fall.
        ch = round(min(eye_y / EYE_LINE,
                       (h - eye_y) / (1 - EYE_LINE),
                       w / RATIO,
                       h))
        cw = round(ch * RATIO)
        top = max(0, min(h - ch, round(eye_y - EYE_LINE * ch)))
        left = max(0, min(w - cw, face_x - cw // 2))

        out = (im.crop((left, top, left + cw, top + ch))
                 .resize((OUT_W, round(OUT_W / RATIO)), Image.LANCZOS))
        dest = f"assets/team/{slug}-hero.webp"
        out.save(dest, "WEBP", quality=84, method=6)

        # square avatar for schema.org image, cut from the same anchored crop so
        # it frames the face the same way the card does
        sq_dest = f"assets/team/{slug}.webp"
        out.crop((0, 0, OUT_W, OUT_W)).resize((400, 400), Image.LANCZOS) \
           .save(sq_dest, "WEBP", quality=86, method=6)

        landed = (eye_y - top) / ch
        print(f"  {slug:18s} {w}x{h} -> crop {cw}x{ch} at ({left},{top}) "
              f"-> {out.size[0]}x{out.size[1]}  {os.path.getsize(dest)//1024}KB   "
              f"eye line at {landed:.1%}")

        e = people.get(slug)
        if not e:
            print(f"    no entry in employees.json - skipping link preview")
            continue
        org = (e.get("company") or "Finasheet LLC")
        if e.get("location"):
            org += "  ·  " + e["location"]
        og_dest = f"assets/team/{slug}-og.jpg"
        size = og_card(dest, e["name"], e.get("title", ""), org, og_dest)
        print(f"    link preview {OG_W}x{OG_H} -> {og_dest}  {size//1024}KB")


if __name__ == "__main__":
    main()
