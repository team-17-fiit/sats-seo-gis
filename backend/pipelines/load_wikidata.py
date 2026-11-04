"""Wikidata SPARQL -> staging.wikidata_item -> doplnenie canonical.poi (S2-3, T2-07).

Pre POI s wikidata_id stiahne opis SK/EN, obrázok (P18), web (P856) a UNESCO (P1435 = Q9259),
uloží surový extrakt data/raw/wikidata-sk-heritage.json + SHA256 (kap. 6.1, krok 1), načíta ho
do staging a doplní len prázdne polia v canonical.poi. Wikidata = CC0 (licenčný register).

    python -m pipelines.load_wikidata             # SPARQL dotaz na query.wikidata.org
    python -m pipelines.load_wikidata --fixture   # vzorka data/fixtures/wikidata/sample.json
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request

from .common import FIXTURES_DIR, RAW_DIR, connect, mark_fetched
from .fetch import sha256_of
from .quality import quality_score, tier_for

ENDPOINT = "https://query.wikidata.org/sparql"
# služba vyžaduje popisný User-Agent (https://meta.wikimedia.org/wiki/User-Agent_policy)
USER_AGENT = "SATS-SEO-GIS/0.1 (https://github.com/team-17-fiit/sats-seo-gis)"
RAW_FILE = "wikidata-sk-heritage.json"
BATCH = 200
WORLD_HERITAGE_SITE = "Q9259"

QUERY = """
SELECT ?item ?descSk ?descEn ?image ?website ?unesco WHERE {{
  VALUES ?item {{ {values} }}
  OPTIONAL {{ ?item schema:description ?descSk FILTER(LANG(?descSk) = "sk") }}
  OPTIONAL {{ ?item schema:description ?descEn FILTER(LANG(?descEn) = "en") }}
  OPTIONAL {{ ?item wdt:P18 ?image }}
  OPTIONAL {{ ?item wdt:P856 ?website }}
  BIND(EXISTS {{ ?item wdt:P1435 wd:{whs} }} AS ?unesco)
}}
"""

# stĺpec staging.wikidata_item -> premenná v SPARQL výsledku
FIELDS = {"description_sk": "descSk", "description_en": "descEn", "image": "image", "website": "website"}


def build_query(qids: list[str]) -> str:
    return QUERY.format(values=" ".join(f"wd:{q}" for q in qids), whs=WORLD_HERITAGE_SITE)


def batches(qids: list[str], size: int = BATCH) -> list[list[str]]:
    return [qids[i : i + size] for i in range(0, len(qids), size)]


def parse(doc: dict) -> dict[str, dict]:
    """SPARQL JSON -> {qid: riadok}. Pri viacerých hodnotách (napr. dva obrázky) berie prvú."""
    items: dict[str, dict] = {}
    for b in doc["results"]["bindings"]:
        qid = b["item"]["value"].rsplit("/", 1)[-1]
        row = items.setdefault(qid, {"qid": qid, **dict.fromkeys(FIELDS), "unesco": False, "raw": []})
        row["raw"].append(b)
        for field, var in FIELDS.items():
            if row[field] is None and var in b:
                row[field] = b[var]["value"]
        row["unesco"] = row["unesco"] or b.get("unesco", {}).get("value") == "true"
    for row in items.values():
        if row["image"]:
            row["image"] = row["image"].replace("http://", "https://", 1)
    return items


def sparql(qids: list[str]) -> list[dict]:
    body = urllib.parse.urlencode({"query": build_query(qids)}).encode()
    req = urllib.request.Request(
        ENDPOINT, data=body, headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)["results"]["bindings"]


def fetch(qids: list[str]):
    """Stiahne všetky dávky a zapíše jeden surový extrakt do data/raw/."""
    bindings: list[dict] = []
    for i, chunk in enumerate(batches(qids)):
        if i:
            time.sleep(1)  # šetrne k verejnej službe
        bindings.extend(sparql(chunk))
        print(f"  ↓ Wikidata dávka {i + 1}: {len(chunk)} položiek")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    target = RAW_DIR / RAW_FILE
    doc = {"head": {"vars": ["item", *FIELDS.values(), "unesco"]}, "results": {"bindings": bindings}}
    target.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    digest = sha256_of(target)
    with open(RAW_DIR / "CHECKSUMS.txt", "a", encoding="utf-8") as log:
        log.write(f"{digest}  {RAW_FILE}\n")
    return target, digest


def stage(cur, items: dict[str, dict]) -> None:
    """Staging sa pri každom behu prepíše (pravidlo 2 kap. 6.4: raw je nemenný, staging nie)."""
    cur.execute("TRUNCATE staging.wikidata_item")
    for row in items.values():
        cur.execute(
            """INSERT INTO staging.wikidata_item (qid, description_sk, description_en, image, website, unesco, raw)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                row["qid"],
                row["description_sk"],
                row["description_en"],
                row["image"],
                row["website"],
                row["unesco"],
                json.dumps(row["raw"], ensure_ascii=False),
            ),
        )


def enrich(cur) -> int:
    """Doplní len prázdne polia (údaje z iných zdrojov majú prednosť), potom prepočíta tier a skóre.

    Tier sa môže len zvýšiť (UNESCO -> T1); kurátorské zastávky ostávajú T1. Status sa nemení.
    """
    cur.execute(
        """
        UPDATE canonical.poi p SET
          description_sk = COALESCE(p.description_sk, w.description_sk),
          description_en = COALESCE(p.description_en, w.description_en),
          image = COALESCE(p.image, w.image),
          website = COALESCE(p.website, w.website),
          unesco = p.unesco OR w.unesco,
          updated_at = now()
        FROM staging.wikidata_item w, canonical.licence l
        WHERE w.qid = p.wikidata_id AND l.id = p.licence_id
        RETURNING p.id, p.category, p.tier, p.unesco, p.name_sk, p.name_en, p.image, p.opening_hours,
                  p.description_sk, l.public_ok
        """
    )
    rows = cur.fetchall()
    for poi_id, category, tier, unesco, name_sk, name_en, image, opening_hours, description, public_ok in rows:
        score = quality_score(
            {
                "name_sk": name_sk,
                "name_en": name_en,
                "wikidata": True,
                "image": image,
                "opening_hours": opening_hours,
                "description": description,
                "licence_clear": public_ok,
            }
        )
        new_tier = min(tier, tier_for(category, has_wikidata=True, unesco=unesco))
        cur.execute("UPDATE canonical.poi SET tier = %s, quality_score = %s WHERE id = %s", (new_tier, score, poi_id))
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()

    digest = None
    if args.fixture:
        path = FIXTURES_DIR / "wikidata" / "sample.json"
    else:
        with connect() as conn, conn.cursor() as cur:
            cur.execute("SELECT DISTINCT wikidata_id FROM canonical.poi WHERE wikidata_id IS NOT NULL ORDER BY 1")
            qids = [r[0] for r in cur.fetchall()]
        print(f"Wikidata: {len(qids)} POI s wikidata_id")
        path, digest = fetch(qids)

    items = parse(json.loads(path.read_text(encoding="utf-8")))
    with connect() as conn, conn.cursor() as cur:
        stage(cur, items)
        enriched = enrich(cur)
        mark_fetched(cur, "wikidata", digest)
        conn.commit()
    unesco = sum(1 for r in items.values() if r["unesco"])
    print(f"Wikidata: {len(items)} položiek v staging ({unesco} UNESCO), doplnených POI: {enriched}")


if __name__ == "__main__":
    main()
