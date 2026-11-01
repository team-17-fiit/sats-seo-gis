-- =============================================================================
-- 003 – marts: pohľady pre SSG export a KPI (K10 data coverage)
-- =============================================================================

-- Stránky trás: trasa + zoradené zastávky (vstup pre export_static.py a API)
-- DROP: 005 pridáva stĺpec segments a CREATE OR REPLACE nevie stĺpce ubrať pri opakovanom behu
DROP VIEW IF EXISTS marts.mart_path_pages;
CREATE OR REPLACE VIEW marts.mart_path_pages AS
SELECT
    pa.slug, pa.name_sk, pa.name_en, pa.theme, pa.pilot_code, pa.difficulty,
    pa.length_km, pa.colour, pa.mark, pa.summary_sk, pa.summary_en,
    COALESCE(
      json_agg(json_build_object(
          'slug', p.slug, 'name_sk', p.name_sk, 'name_en', p.name_en,
          'category', p.category, 'unesco', p.unesco, 'seq', pp.seq,
          'lat', ST_Y(p.geom), 'lon', ST_X(p.geom))
        ORDER BY pp.seq) FILTER (WHERE p.id IS NOT NULL),
      '[]'::json) AS stops,
    l.code AS licence
FROM canonical.path pa
JOIN canonical.licence l ON l.id = pa.licence_id
LEFT JOIN canonical.poi_path pp ON pp.path_id = pa.id AND pp.role = 'stop'
LEFT JOIN canonical.poi p ON p.id = pp.poi_id
GROUP BY pa.id, l.code;

-- Stránky POI: len verejne publikovateľné (licencia public_ok, nie zamietnuté)
CREATE OR REPLACE VIEW marts.mart_poi_pages AS
SELECT
    p.slug, p.name_sk, p.name_en, p.category, p.tier, p.status, p.unesco,
    p.elevation_m, p.wikidata_id, p.description_sk, p.description_en,
    ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon,
    s.code AS source, l.code AS licence, l.attribution,
    ARRAY(SELECT pa.slug FROM canonical.poi_path pp JOIN canonical.path pa ON pa.id = pp.path_id
          WHERE pp.poi_id = p.id ORDER BY pa.slug) AS paths
FROM canonical.poi p
JOIN canonical.source s ON s.id = p.source_id
JOIN canonical.licence l ON l.id = p.licence_id
WHERE l.public_ok AND p.status NOT IN ('rejected', 'discarded', 'archived');

-- KPI K10: pokrytie POI podľa zdroja, licencie a tieru
CREATE OR REPLACE VIEW marts.mart_coverage AS
SELECT s.code AS source, l.code AS licence, p.tier, p.status, count(*) AS poi_count
FROM canonical.poi p
JOIN canonical.source s ON s.id = p.source_id
JOIN canonical.licence l ON l.id = p.licence_id
GROUP BY s.code, l.code, p.tier, p.status;

INSERT INTO canonical.schema_migration (version) VALUES ('003_marts') ON CONFLICT DO NOTHING;
