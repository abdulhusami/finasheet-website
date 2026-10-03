#!/usr/bin/env python3
"""Render an opted-in HTML source with the shared Finasheet partials.

Live pages are never scanned or rewritten. A source must contain each marker
exactly once; the caller chooses an output path. SEO metadata and page copy
stay in the source. Tracking is copied from the current homepage via the
Phase 0 site_tracking module, or preserved when already present in source.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from site_tracking import snippets


ROOT = Path(__file__).resolve().parent.parent
PARTIALS = ROOT / "_partials"
MARKERS = {
    "head": "<!-- fs:head -->",
    "body_tracking": "<!-- fs:body-tracking -->",
    "header": "<!-- fs:header -->",
    "footer": "<!-- fs:footer -->",
    "mobile_cta": "<!-- fs:mobile-cta -->",
}
TRACKING_MARKERS = (
    "<!-- Google Tag Manager -->",
    "<!-- End Google Tag Manager -->",
    "<!-- Meta Pixel Code -->",
    "<!-- End Meta Pixel Code -->",
    "<!-- Google Tag Manager (noscript) -->",
    "<!-- End Google Tag Manager (noscript) -->",
)


def render(source: str) -> str:
    for name, marker in MARKERS.items():
        if source.count(marker) != 1:
            raise ValueError(f"expected exactly one {name} marker: {marker}")
    if source.count("<head>") != 1 or source.count("</head>") != 1:
        raise ValueError("source must have one head element")
    if source.count("<body") != 1 or source.count("</body>") != 1:
        raise ValueError("source must have one body element")
    if 'class="fs-site"' not in source or 'id="main"' not in source:
        raise ValueError('source needs body class="fs-site" and main id="main"')

    head_tracking, body_tracking = snippets()
    counts = [source.count(marker) for marker in TRACKING_MARKERS]
    if counts not in ([0] * len(TRACKING_MARKERS), [1] * len(TRACKING_MARKERS)):
        raise ValueError("source has incomplete or duplicate Phase 0 tracking")
    already_tracked = counts == [1] * len(TRACKING_MARKERS)
    if already_tracked and (source.count("GTM-5G2N637G") != 2 or
                            source.count("1313660467555616") != 2):
        raise ValueError("source tracking IDs differ from Phase 0")

    head = (PARTIALS / "head.html").read_text(encoding="utf-8")
    head = head.replace("<!-- fs:tracking-head -->", "" if already_tracked else head_tracking)
    replacements = {
        "head": head,
        "body_tracking": "" if already_tracked else body_tracking,
        "header": (PARTIALS / "header.html").read_text(encoding="utf-8"),
        "footer": (PARTIALS / "footer.html").read_text(encoding="utf-8"),
        "mobile_cta": (PARTIALS / "mobile-cta.html").read_text(encoding="utf-8"),
    }
    output = source
    for name, marker in MARKERS.items():
        output = output.replace(marker, replacements[name].rstrip())
    for marker in TRACKING_MARKERS:
        if output.count(marker) != 1:
            raise ValueError(f"rendered tracking count is not one: {marker}")
    if any(marker in output for marker in MARKERS.values()):
        raise ValueError("unresolved partial marker")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="opted-in HTML source")
    parser.add_argument("--output", required=True, type=Path, help="rendered HTML destination")
    parser.add_argument("--check", action="store_true", help="compare without writing")
    args = parser.parse_args()

    source_path = args.input.resolve()
    output_path = args.output.resolve()
    if source_path == output_path:
        parser.error("input and output must be different files")
    if not source_path.is_file():
        parser.error(f"input does not exist: {source_path}")

    try:
        output = render(source_path.read_text(encoding="utf-8"))
    except ValueError as exc:
        parser.error(str(exc))

    if args.check:
        if not output_path.is_file() or output_path.read_text(encoding="utf-8") != output:
            print(f"out of date: {output_path}", file=sys.stderr)
            return 1
        print(f"up to date: {output_path}")
        return 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not output_path.is_file() or output_path.read_text(encoding="utf-8") != output:
        output_path.write_text(output, encoding="utf-8")
        print(f"wrote: {output_path}")
    else:
        print(f"unchanged: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
