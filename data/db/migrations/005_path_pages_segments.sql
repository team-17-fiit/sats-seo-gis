-- =============================================================================
-- 005 – mart_path_pages posiela aj geometriu úsekov trasy (T2-06)
-- segments = pole čiar [[lon, lat], ...] v poradí seq; web ich kreslí namiesto priamok
-- =============================================================================

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
    l.code AS licence,
    (SELECT COALESCE(json_agg((ST_AsGeoJSON(s.geom, 5)::json) -> 'coordinates' ORDER BY s.seq), '[]'::json)
       FROM canonical.path_segment s WHERE s.path_id = pa.id) AS segments
FROM canonical.path pa
JOIN canonical.licence l ON l.id = pa.licence_id
LEFT JOIN canonical.poi_path pp ON pp.path_id = pa.id AND pp.role = 'stop'
LEFT JOIN canonical.poi p ON p.id = pp.poi_id
GROUP BY pa.id, l.code;

INSERT INTO canonical.schema_migration (version) VALUES ('005_path_pages_segments') ON CONFLICT DO NOTHING;
