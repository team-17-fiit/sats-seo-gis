-- =============================================================================
-- 010 – mart_tiles: vrstvy pre generovanie dlaždíc (T3-07, kap. 6.1 krok 7, obr. 6.1)
-- Vstup pre tippecanoe -> PMTiles z5–z15 (kap. 5.1.3). Do dlaždíc ide len verejný obsah:
-- licencia public_ok (nikdy PROPRIETARY) a POI v stave approved/published (licenčný register, pravidlá 1–2).
-- Každý prvok nesie svoju licenciu (ODbL / CC BY / CC0 / PD) kvôli atribúcii.
-- =============================================================================

CREATE OR REPLACE VIEW marts.mart_tiles AS
SELECT
    'paths'::text AS layer,
    pa.slug || '-' || s.seq AS feature_id,
    jsonb_build_object('slug', pa.slug, 'name_sk', pa.name_sk, 'name_en', pa.name_en,
                       'colour', pa.colour, 'theme', pa.theme) AS props,
    l.code AS licence,
    NULL::smallint AS tier,
    s.geom::geometry AS geom
FROM canonical.path_segment s
JOIN canonical.path pa ON pa.id = s.path_id
JOIN canonical.licence l ON l.id = s.licence_id
WHERE l.public_ok
UNION ALL
SELECT
    'pois'::text,
    p.slug,
    jsonb_build_object('slug', p.slug, 'name_sk', p.name_sk, 'name_en', p.name_en,
                       'category', p.category, 'tier', p.tier, 'unesco', p.unesco),
    l.code,
    p.tier,
    p.geom::geometry
FROM canonical.poi p
JOIN canonical.licence l ON l.id = p.licence_id
WHERE l.public_ok AND p.status IN ('approved', 'published');

INSERT INTO canonical.schema_migration (version) VALUES ('010_mart_tiles') ON CONFLICT DO NOTHING;
