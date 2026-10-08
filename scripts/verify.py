"""Validate the generated static pages and their local assets without network access."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.headings = 0
        self.lang = None
        self.description = False
        self.viewport = False
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "h1":
            self.headings += 1
        if tag == "meta":
            self.description |= attrs.get("name") == "description" and bool(attrs.get("content"))
            self.viewport |= attrs.get("name") == "viewport"
        if tag == "img" and not attrs.get("alt"):
            self.errors.append("Image missing alt text")
        for attribute in ("src", "href"):
            if attrs.get(attribute):
                self.references.append((tag, attrs[attribute]))
        if tag == "form" and attrs.get("method", "").lower() == "post":
            self.errors.append("Unexpected server-backed POST form")


errors = []
local_refs = set()
external_resources = set()
root_pages = sorted(ROOT.glob("*.html"))
pages = root_pages + sorted(page for category in ("주거공간", "상업공간") for page in (ROOT / "portfolio" / category).glob("*/index.html"))
if len(root_pages) != 7:
    errors.append(f"Expected 7 root pages, found {len(root_pages)}")


def check_reference(source, reference):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        return
    if not parsed.path:
        return
    if parsed.path.startswith("/"):
        errors.append(f"{source.name}: absolute path is incompatible with file opening: {reference}")
        return
    target = (source.parent / unquote(parsed.path)).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        errors.append(f"{source.name}: missing local reference {reference}")
    else:
        local_refs.add(str(target.relative_to(ROOT)))


for page in pages:
    parser = PageParser()
    parser.feed(page.read_text(encoding="utf-8"))
    errors.extend(f"{page.name}: {error}" for error in parser.errors)
    if parser.headings != 1 or parser.lang != "ko" or not parser.description or not parser.viewport:
        errors.append(f"{page.name}: invalid language, heading, or metadata")
    for tag, reference in parser.references:
        check_reference(page, reference)
        if tag in ("script", "img", "link") and urlsplit(reference).scheme in ("http", "https"):
            external_resources.add(reference)

for stylesheet in ROOT.glob("assets/**/*.css"):
    for match in re.finditer(r"url\(\s*['\"]?([^\)\s'\"]+)", stylesheet.read_text(encoding="utf-8")):
        check_reference(stylesheet, match.group(1))

for asset in [*ROOT.glob("assets/**/*"), *ROOT.glob("portfolio/**/*")]:
    if not asset.is_file():
        continue
    data = asset.read_bytes()
    if not data:
        errors.append(f"Empty asset: {asset.relative_to(ROOT)}")
    extension = asset.suffix.lower()
    if extension == ".woff2" and data[:4] != b"wOF2":
        errors.append(f"Invalid WOFF2: {asset.name}")
    if extension == ".woff" and data[:4] != b"wOFF":
        errors.append(f"Invalid WOFF: {asset.name}")
    if extension == ".ttf" and data[:4] != b"\x00\x01\x00\x00":
        errors.append(f"Invalid TTF: {asset.name}")
    if extension in (".jpg", ".jpeg") and data[:2] != b"\xff\xd8":
        errors.append(f"Invalid JPEG: {asset.name}")
    if extension == ".png" and data[:8] != b"\x89PNG\r\n\x1a\n":
        errors.append(f"Invalid PNG: {asset.name}")
    if extension == ".webp" and (data[:4] != b"RIFF" or data[8:12] != b"WEBP"):
        errors.append(f"Invalid WebP: {asset.name}")
    if extension == ".avif" and (data[4:8] != b"ftyp" or b"avif" not in data[8:32]):
        errors.append(f"Invalid AVIF: {asset.name}")

expected_external = {"https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js"}
if external_resources != expected_external:
    errors.append(f"Unexpected external resources: {sorted(external_resources)}")

report = {
    "passed": not errors,
    "pages": [page.relative_to(ROOT).as_posix() for page in pages],
    "local_references_checked": len(local_refs),
    "external_runtime_resources": sorted(external_resources),
    "errors": errors,
}
if len(sys.argv) == 1:
    (ROOT / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=True, indent=2))
sys.exit(1 if errors else 0)
