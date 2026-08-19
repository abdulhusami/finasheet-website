"""Cut the card portrait from each original headshot.

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
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EYE_LINE = 0.30      # where the eyes sit in the output, and in the CSS anchor
RATIO = 0.8          # 4:5 portrait
OUT_W = 800

# slug -> (face centre x, eye line y) measured in the original
FACE = {
    "buhari-anshif": (555, 271),
    "sradha-santhosh": (575, 277),
}


def main():
    os.chdir(ROOT)
    for slug, (face_x, eye_y) in FACE.items():
        src = f"assets/team/originals/{slug}.jpg"
        im = Image.open(src).convert("RGB")
        w, h = im.size

        # tallest crop that still puts the eye line at EYE_LINE, then trimmed to
        # whatever the frame can actually give
        ch = min(round(eye_y / EYE_LINE), h)
        cw = round(ch * RATIO)
        if cw > w:
            cw, ch = w, round(w / RATIO)
        top = max(0, min(h - ch, round(eye_y - EYE_LINE * ch)))
        left = max(0, min(w - cw, face_x - cw // 2))

        out = (im.crop((left, top, left + cw, top + ch))
                 .resize((OUT_W, round(OUT_W / RATIO)), Image.LANCZOS))
        dest = f"assets/team/{slug}-hero.webp"
        out.save(dest, "WEBP", quality=84, method=6)

        landed = (eye_y - top) / ch
        print(f"  {slug:18s} {w}x{h} -> crop {cw}x{ch} at ({left},{top}) "
              f"-> {out.size[0]}x{out.size[1]}  {os.path.getsize(dest)//1024}KB   "
              f"eye line at {landed:.1%}")


if __name__ == "__main__":
    main()
