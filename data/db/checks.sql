-- =============================================================================
-- Dátové kontrakty (testovacia úroveň "Contract", tab. 5.3)
-- Každý dotaz vracia POČET PORUŠENÍ; očakávame 0. Spúšťa pipelines.validate.
-- Formát: jeden dotaz na riadok začínajúci "-- check:" a nasledujúci SELECT.
-- =============================================================================

-- check: poi_without_source_or_licence
SELECT count(*) FROM canonical.poi WHERE source_id IS NULL OR licence_id IS NULL;

-- check: poi_invalid_geometry
SELECT count(*) FROM canonical.poi WHERE NOT ST_IsValid(geom);

-- check: poi_outside_slovakia_buffer
SELECT count(*) FROM canonical.poi
WHERE NOT ST_Intersects(geom, ST_MakeEnvelope(16.6, 47.6, 22.7, 49.7, 4326));

-- check: path_without_stops
SELECT count(*) FROM canonical.path pa
WHERE NOT EXISTS (SELECT 1 FROM canonical.poi_path pp WHERE pp.path_id = pa.id);

-- check: source_with_unknown_licence
SELECT count(*) FROM canonical.source s
LEFT JOIN canonical.licence l ON l.id = s.licence_id WHERE l.id IS NULL;

-- check: proprietary_in_public_mart
SELECT count(*) FROM marts.mart_poi_pages WHERE licence = 'PROPRIETARY';
