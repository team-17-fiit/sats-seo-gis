-- =============================================================================
-- Dátové kontrakty (testovacia úroveň "Contract", tab. 5.3)
-- Každý dotaz vracia POČET PORUŠENÍ; očakávame 0. Spúšťa pipelines.validate.
-- Formát: riadok "-- check: <názov>" (porušenie = exit 1) alebo "-- warn: <názov>"
-- (len varovanie) a za ním jeden SELECT.
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

-- check: route_without_segments
SELECT count(*) FROM canonical.route r
WHERE r.geom IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM canonical.route_segment s WHERE s.route_id = r.id);

-- =============================================================================
-- Geodátové kontroly (T2-11). "-- check:" = chyba (exit 1), "-- warn:" = len varovanie.
-- Prahy sú rovnaké ako v backend/pipelines/geocheck.py (kontrola exportu pre web).
-- =============================================================================

-- check: path_segment_degenerate
SELECT count(*) FROM canonical.path_segment
WHERE ST_NPoints(geom) < 2 OR ST_Length(geom::geography) < 1;

-- check: path_segment_outside_slovakia_buffer
SELECT count(*) FROM canonical.path_segment
WHERE NOT ST_CoveredBy(geom, ST_MakeEnvelope(16.6, 47.6, 22.7, 49.7, 4326));

-- check: path_segment_gap_over_50m
SELECT count(*) FROM (
    SELECT geom, lead(geom) OVER (PARTITION BY path_id ORDER BY seq) AS nxt
    FROM canonical.path_segment
) s
WHERE nxt IS NOT NULL
  AND ST_Distance(ST_EndPoint(geom)::geography, ST_StartPoint(nxt)::geography) > 50;

-- check: path_stop_seq_invalid
SELECT count(*) FROM (
    SELECT path_id FROM canonical.poi_path WHERE role = 'stop'
    GROUP BY path_id
    HAVING count(*) FILTER (WHERE seq IS NULL) > 0
        OR count(DISTINCT seq) <> count(*)
        OR min(seq) <> 1 OR max(seq) <> count(*)
) bad;

-- check: path_ends_off_first_or_last_stop
SELECT count(*) FROM canonical.path pa
JOIN LATERAL (SELECT min(seq) AS s0, max(seq) AS s1 FROM canonical.path_segment WHERE path_id = pa.id) e ON e.s0 IS NOT NULL
JOIN canonical.path_segment f ON f.path_id = pa.id AND f.seq = e.s0
JOIN canonical.path_segment l ON l.path_id = pa.id AND l.seq = e.s1
JOIN LATERAL (
    SELECT (array_agg(p.geom ORDER BY pp.seq))[1] AS first_stop,
           (array_agg(p.geom ORDER BY pp.seq DESC))[1] AS last_stop
    FROM canonical.poi_path pp JOIN canonical.poi p ON p.id = pp.poi_id
    WHERE pp.path_id = pa.id AND pp.role = 'stop'
) st ON true
WHERE ST_Distance(ST_StartPoint(f.geom)::geography, st.first_stop::geography) > 50
   OR ST_Distance(ST_EndPoint(l.geom)::geography, st.last_stop::geography) > 50;

-- check: path_stop_far_from_route_200m
SELECT count(*) FROM canonical.poi_path pp
JOIN canonical.poi p ON p.id = pp.poi_id
WHERE pp.role = 'stop'
  AND EXISTS (SELECT 1 FROM canonical.path_segment s WHERE s.path_id = pp.path_id)
  AND NOT EXISTS (
      SELECT 1 FROM canonical.path_segment s
      WHERE s.path_id = pp.path_id AND ST_DWithin(s.geom::geography, p.geom::geography, 200)
  );

-- warn: poi_outside_slovakia_border_2km
SELECT count(*) FROM canonical.poi p
WHERE p.status IN ('approved', 'published')
  AND EXISTS (SELECT 1 FROM canonical.admin_area WHERE code = 'SK')
  AND NOT EXISTS (
      SELECT 1 FROM canonical.admin_area a
      WHERE a.code = 'SK' AND ST_DWithin(a.geom::geography, p.geom::geography, 2000)
  );

-- warn: poi_duplicate_name_within_50m
SELECT count(*) FROM canonical.poi a
JOIN canonical.poi b
  ON a.id < b.id
 AND lower(a.name_sk) = lower(b.name_sk)
 AND ST_DWithin(a.geom::geography, b.geom::geography, 50)
WHERE a.status IN ('approved', 'published') AND b.status IN ('approved', 'published');

-- warn: poi_elevation_implausible
SELECT count(*) FROM canonical.poi
WHERE elevation_m IS NOT NULL AND (elevation_m < 90 OR elevation_m > 2660);

-- warn: path_length_mismatch_25pct
SELECT count(*) FROM canonical.path pa
JOIN (
    SELECT path_id, sum(ST_Length(geom::geography)) / 1000 AS km
    FROM canonical.path_segment GROUP BY path_id
) g ON g.path_id = pa.id
WHERE pa.length_km > 0 AND abs(g.km - pa.length_km) > 0.25 * pa.length_km;
