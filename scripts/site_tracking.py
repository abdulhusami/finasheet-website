"""Reuse the homepage's existing GTM and Meta Pixel snippets in generated pages."""

from pathlib import Path


HOME = Path(__file__).resolve().parent.parent / "index.html"


def _snippet(source, start, end):
    assert source.count(start) == 1 and source.count(end) == 1
    return start + source.split(start, 1)[1].split(end, 1)[0] + end


def snippets():
    source = HOME.read_text(encoding="utf-8")
    head = "\n".join((
        _snippet(source, "<!-- Google Tag Manager -->", "<!-- End Google Tag Manager -->"),
        _snippet(source, "<!-- Meta Pixel Code -->", "<!-- End Meta Pixel Code -->"),
    ))
    body = _snippet(
        source,
        "<!-- Google Tag Manager (noscript) -->",
        "<!-- End Google Tag Manager (noscript) -->",
    )
    return head, body
