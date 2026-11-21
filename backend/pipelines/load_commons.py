"""Autor a licencia obrázkov POI z Wikimedia Commons -> canonical.poi_image (T3-12).

Obrázky (poi.image) prišli z Wikidata (P18) ako odkazy na súbory na Commons. Každý súbor má vlastnú
licenciu a väčšinou vyžaduje uviesť autora – tie údaje dáva API Commons (imageinfo/extmetadata).
Surová odpoveď ide do data/raw/commons-images.json + SHA256 (kap. 6.1, krok 1).

    python -m pipelines.load_commons             # API commons.wikimedia.org
    python -m pipelines.load_commons --fixture   # vzorka data/fixtures/commons/sample.json
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.parse

from .common import FIXTURES_DIR, RAW_DIR, connect, mark_fetched, source_ids
from .fetch import get_json, sha256_of

API = "https://commons.wikimedia.org/w/api.php"
FILE_PATH = "/wiki/Special:FilePath/"
RAW_FILE = "commons-images.json"
BATCH = 50  # API Commons prijme najviac 50 názvov súborov v jednej požiadavke
FIELDS = "Artist|LicenseShortName|LicenseUrl|AttributionRequired"


def file_title(image_url: str) -> str | None:
    """https://commons.wikimedia.org/wiki/Special:FilePath/Rysy%20x.jpg -> 'File:Rysy x.jpg'."""
    if FILE_PATH not in image_url:
        return None
    return "File:" + urllib.parse.unquote(image_url.split(FILE_PATH, 1)[1])


def plain_text(value: str | None) -> str | None:
    """Pole Artist je HTML (odkaz na používateľa) – pre atribúciu stačí čistý text."""
    if not value:
        return None
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", "", value)).split())
    return text or None


def parse(doc: dict) -> tuple[dict[str, str], dict[str, dict]]:
    """Odpoveď API -> (premenovania názvov, {názov súboru: metadáta}). Chýbajúce súbory preskočí."""
    query = doc.get("query", {})
    renamed = {n["from"]: n["to"] for n in query.get("normalized", [])}
    meta = {}
    for page in query.get("pages", []):
        if page.get("missing") or not page.get("imageinfo"):
            continue
        ext = page["imageinfo"][0].get("extmetadata", {})
        value = {key: (ext.get(key) or {}).get("value") for key in FIELDS.split("|")}
        meta[page["title"]] = {
            "author": plain_text(value["Artist"]),
            "licence": plain_text(value["LicenseShortName"]),
            "licence_url": value["LicenseUrl"],
            "attribution_required": None
            if value["AttributionRequired"] is None
            else value["AttributionRequired"] == "true",
            "raw": page,
        }
    return renamed, meta


def rows_for(images: list[str], doc: dict) -> list[dict]:
    """Metadáta priradené k URL obrázkov z DB; obrázky bez údajov na Commons vynechá."""
    renamed, meta = parse(doc)
    rows = []
    for image in images:
        title = file_title(image)
        title = renamed.get(title, title)
        if title in meta:
            source_url = "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"), safe=":")
            rows.append({"image": image, "source_url": source_url, **meta[title]})
    return rows


def fetch(images: list[str]):
    """Stiahne metadáta po dávkach a zapíše jeden surový extrakt do data/raw/ (rovnaký tvar ako odpoveď API)."""
    titles = sorted({t for t in map(file_title, images) if t})
    merged: dict = {"query": {"normalized": [], "pages": []}}
    for i in range(0, len(titles), BATCH):
        if i:
            time.sleep(1)  # šetrne k verejnej službe
        params = {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "prop": "imageinfo",
            "iiprop": "extmetadata",
            "iiextmetadatafilter": FIELDS,
            "titles": "|".join(titles[i : i + BATCH]),
        }
        doc = get_json(API, data=urllib.parse.urlencode(params).encode(), label="Commons")
        merged["query"]["normalized"] += doc.get("query", {}).get("normalized", [])
        merged["query"]["pages"] += doc.get("query", {}).get("pages", [])
        print(f"  ↓ Commons dávka {i // BATCH + 1}: {len(titles[i : i + BATCH])} súborov")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    target = RAW_DIR / RAW_FILE
    target.write_text(json.dumps(merged, ensure_ascii=False), encoding="utf-8")
    with open(RAW_DIR / "CHECKSUMS.txt", "a", encoding="utf-8") as log:
        log.write(f"{sha256_of(target)}  {RAW_FILE}\n")
    return merged


def load(cur, rows: list[dict]) -> None:
    src_id, _ = source_ids(cur, "wikimedia_commons")
    for r in rows:
        cur.execute(
            """INSERT INTO canonical.poi_image
                 (image, source_url, author, licence, licence_url, attribution_required, raw, source_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (image) DO UPDATE SET
                 source_url = EXCLUDED.source_url, author = EXCLUDED.author, licence = EXCLUDED.licence,
                 licence_url = EXCLUDED.licence_url, attribution_required = EXCLUDED.attribution_required,
                 raw = EXCLUDED.raw, fetched_at = now()""",
            (
                r["image"],
                r["source_url"],
                r["author"],
                r["licence"],
                r["licence_url"],
                r["attribution_required"],
                json.dumps(r["raw"], ensure_ascii=False),
                src_id,
            ),
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()

    with connect() as conn, conn.cursor() as cur:
        source_ids(cur, "wikimedia_commons")  # licenčná brána ešte pred stiahnutím
        cur.execute("SELECT DISTINCT image FROM canonical.poi WHERE image IS NOT NULL ORDER BY 1")
        images = [r[0] for r in cur.fetchall()]
    print(f"Commons: {len(images)} obrázkov POI")
    if args.fixture:
        doc = json.loads((FIXTURES_DIR / "commons" / "sample.json").read_text(encoding="utf-8"))
    else:
        doc = fetch(images)

    rows = rows_for(images, doc)
    with connect() as conn, conn.cursor() as cur:
        load(cur, rows)
        mark_fetched(cur, "wikimedia_commons")
        conn.commit()
    with_author = sum(1 for r in rows if r["author"])
    print(f"Commons: údaje pre {len(rows)} obrázkov, z toho {with_author} s autorom")


if __name__ == "__main__":
    main()
