-- =============================================================================
-- 011 – autor a licencia obrázkov z Wikimedia Commons (T3-12)
-- Obrázky POI (poi.image, Wikidata P18) sú súbory na Wikimedia Commons (príloha L.4/L.5:
-- „Wikimedia Commons (CC-BY-SA-4.0)“). Každý súbor má vlastnú licenciu (CC BY-SA, CC BY, CC0, PD …)
-- a väčšinou vyžaduje uviesť autora. Riadok nesie zdroj, licenciu, atribúciu a čas stiahnutia (obr. 4.4).
-- =============================================================================

INSERT INTO canonical.licence (code, name, url, share_alike, attribution, public_ok)
VALUES ('CC-BY-SA-4.0', 'Creative Commons Attribution-ShareAlike 4.0',
        'https://creativecommons.org/licenses/by-sa/4.0/', true, NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, share_alike = EXCLUDED.share_alike,
  attribution = EXCLUDED.attribution, public_ok = EXCLUDED.public_ok;

INSERT INTO canonical.source (code, name, url, licence_id)
SELECT 'wikimedia_commons', 'Wikimedia Commons – metadáta súborov (autor, licencia)',
       'https://commons.wikimedia.org/', l.id
FROM canonical.licence l WHERE l.code = 'CC-BY-SA-4.0'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, licence_id = EXCLUDED.licence_id;

CREATE TABLE IF NOT EXISTS canonical.poi_image (
    image                 text PRIMARY KEY,            -- rovnaká URL ako canonical.poi.image
    source_url            text NOT NULL,               -- stránka súboru na Commons
    author                text,                        -- meno autora ako čistý text (z HTML poľa Artist)
    licence               text,                        -- licencia tohto obrázka (LicenseShortName), napr. „CC BY-SA 3.0“
    licence_url           text,
    attribution_required  boolean,
    raw                   jsonb NOT NULL,
    source_id             smallint NOT NULL REFERENCES canonical.source(id),
    fetched_at            timestamptz NOT NULL DEFAULT now()
);

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
      ORDER BY ST_Area(h.geom) LIMIT 1) AS heritage_area,
    i.author AS image_author, i.licence AS image_licence, i.licence_url AS image_licence_url
FROM canonical.poi p
JOIN canonical.source s ON s.id = p.source_id
JOIN canonical.licence l ON l.id = p.licence_id
LEFT JOIN canonical.poi_image i ON i.image = p.image
WHERE l.public_ok AND p.status NOT IN ('rejected', 'discarded', 'archived');

INSERT INTO canonical.schema_migration (version) VALUES ('011_poi_image') ON CONFLICT DO NOTHING;
