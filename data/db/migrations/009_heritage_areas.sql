-- =============================================================================
-- 009 – pamiatkové územia PÚSR (T2-08)
-- Zdroj: Pamiatkový úrad SR, PAMIS WFS (gis.pamiatky.sk) – pamiatkové rezervácie, pamiatkové zóny,
-- svetové kultúrne dedičstvo UNESCO. Licencia CC BY 4.0 (pamiatky.sk/online-sluzby/poskytovanie-udajov).
-- POI dostane názov územia, v ktorom leží, cez mart_poi_pages.heritage_area.
-- =============================================================================

INSERT INTO canonical.source (code, name, url, licence_id)
SELECT 'pusr', 'Pamiatkový úrad SR – pamiatkové územia (PAMIS WFS)',
       'https://www.pamiatky.sk/online-sluzby/poskytovanie-udajov', l.id
FROM canonical.licence l WHERE l.code = 'CC-BY-4.0'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, licence_id = EXCLUDED.licence_id;

CREATE TABLE IF NOT EXISTS canonical.heritage_area (
    id          serial PRIMARY KEY,
    ext_id      text NOT NULL UNIQUE,             -- <vrstva>:<id> z WFS
    kind        text NOT NULL CHECK (kind IN ('reservation', 'zone', 'unesco')),
    name        text NOT NULL,
    geom        geometry(MultiPolygon, 4326) NOT NULL CHECK (ST_IsValid(geom)),
    source_id   smallint NOT NULL REFERENCES canonical.source(id),
    licence_id  smallint NOT NULL REFERENCES canonical.licence(id)
);
CREATE INDEX IF NOT EXISTS heritage_area_geom_gix ON canonical.heritage_area USING gist (geom);

CREATE OR REPLACE VIEW marts.mart_poi_pages AS
SELECT
    p.slug, p.name_sk, p.name_en, p.category, p.tier, p.status, p.unesco,
    p.elevation_m, p.wikidata_id, p.description_sk, p.description_en,
    ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon,
    s.code AS source, l.code AS licence, l.attribution,
    ARRAY(SELECT pa.slug FROM canonical.poi_path pp JOIN canonical.path pa ON pa.id = pp.path_id
          WHERE pp.poi_id = p.id ORDER BY pa.slug) AS paths,
    p.image, p.opening_hours,
    -- najmenšie územie, v ktorom POI leží (maloplošné býva vnútri veľkoplošného)
    (SELECT a.name FROM canonical.protected_area a WHERE ST_Intersects(a.geom, p.geom)
      ORDER BY ST_Area(a.geom) LIMIT 1) AS protected_area,
    (SELECT h.name FROM canonical.heritage_area h WHERE ST_Intersects(h.geom, p.geom)
      ORDER BY ST_Area(h.geom) LIMIT 1) AS heritage_area
FROM canonical.poi p
JOIN canonical.source s ON s.id = p.source_id
JOIN canonical.licence l ON l.id = p.licence_id
WHERE l.public_ok AND p.status NOT IN ('rejected', 'discarded', 'archived');

INSERT INTO canonical.schema_migration (version) VALUES ('009_heritage_areas') ON CONFLICT DO NOTHING;
