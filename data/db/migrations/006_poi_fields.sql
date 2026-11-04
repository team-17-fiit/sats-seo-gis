-- =============================================================================
-- 006 – kanonický model POI s 24 poľami (T2-05, kap. 6.1)
-- Pribudli obrázok a otváracie hodiny – príznaky quality score z kap. 5.2.2
-- (meno SK+EN, Wikidata, obrázok, otváracie hodiny, opis, licencia).
-- image = URL súboru na Wikimedia Commons (Wikidata P18), opening_hours = OSM syntax.
-- =============================================================================

ALTER TABLE canonical.poi ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE canonical.poi ADD COLUMN IF NOT EXISTS opening_hours text;

CREATE OR REPLACE VIEW marts.mart_poi_pages AS
SELECT
    p.slug, p.name_sk, p.name_en, p.category, p.tier, p.status, p.unesco,
    p.elevation_m, p.wikidata_id, p.description_sk, p.description_en,
    ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon,
    s.code AS source, l.code AS licence, l.attribution,
    ARRAY(SELECT pa.slug FROM canonical.poi_path pp JOIN canonical.path pa ON pa.id = pp.path_id
          WHERE pp.poi_id = p.id ORDER BY pa.slug) AS paths,
    p.image, p.opening_hours
FROM canonical.poi p
JOIN canonical.source s ON s.id = p.source_id
JOIN canonical.licence l ON l.id = p.licence_id
WHERE l.public_ok AND p.status NOT IN ('rejected', 'discarded', 'archived');

INSERT INTO canonical.schema_migration (version) VALUES ('006_poi_fields') ON CONFLICT DO NOTHING;
