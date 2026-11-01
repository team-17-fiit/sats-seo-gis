-- =============================================================================
-- 004 – trasa -> podtrasa (etapa) -> úsek  (šprint 2-2Z)
-- -----------------------------------------------------------------------------
-- path      (trasa)    napr. Hlavná os, 11 zastávok
-- path_leg  (podtrasa) etapa medzi dvoma po sebe idúcimi zastávkami
-- path_segment (úsek)  časť etapy so skutočnou geometriou z OSM (GraphHopper),
--                      rozdelená podľa značenia (network) a spárovaná s OSM reláciou
-- Idempotentné: migrate.py ju spúšťa pri každom behu.
-- =============================================================================

CREATE TABLE IF NOT EXISTS canonical.path_leg (
    id           serial PRIMARY KEY,
    path_id      integer NOT NULL REFERENCES canonical.path(id) ON DELETE CASCADE,
    seq          integer NOT NULL,
    from_poi_id  bigint  NOT NULL REFERENCES canonical.poi(id),
    to_poi_id    bigint  NOT NULL REFERENCES canonical.poi(id),
    profile      text    NOT NULL DEFAULT 'hike' CHECK (profile IN ('hike', 'bike', 'car')),
    via          jsonb,                         -- [[lon, lat], …] ručné korekcie trasovania
    length_m     double precision,
    routed_at    timestamptz,                   -- NULL = etapu treba (pre)počítať
    UNIQUE (path_id, seq)
);

ALTER TABLE canonical.path_segment
    ADD COLUMN IF NOT EXISTS leg_id          integer REFERENCES canonical.path_leg(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS method          text,      -- routed | placeholder (priamka)
    ADD COLUMN IF NOT EXISTS network         text,      -- značenie z GraphHoppera: NATIONAL, REGIONAL, …, MISSING
    ADD COLUMN IF NOT EXISTS osm_relation_id bigint,    -- OSM relácia s najväčším prekryvom
    ADD COLUMN IF NOT EXISTS length_m        double precision;

-- seq je odteraz poradie úseku v rámci etapy, nie v rámci celej trasy
ALTER TABLE canonical.path_segment DROP CONSTRAINT IF EXISTS path_segment_path_id_seq_key;
CREATE UNIQUE INDEX IF NOT EXISTS path_segment_leg_seq_uq ON canonical.path_segment (leg_id, seq);

-- Geometria etáp pre export (jedna LineString na etapu, zjednodušená na ~10 m)
CREATE OR REPLACE VIEW marts.mart_path_geom AS
SELECT
    pa.slug,
    l.seq,
    a.slug AS from_slug,
    b.slug AS to_slug,
    round((l.length_m / 1000)::numeric, 1) AS length_km,
    bool_and(s.method = 'routed') AS routed,
    ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_MakeLine(s.geom ORDER BY s.seq), 0.0001), 5)::json AS geometry
FROM canonical.path_leg l
JOIN canonical.path pa ON pa.id = l.path_id
JOIN canonical.poi a ON a.id = l.from_poi_id
JOIN canonical.poi b ON b.id = l.to_poi_id
JOIN canonical.path_segment s ON s.leg_id = l.id
GROUP BY pa.slug, l.id, l.seq, a.slug, b.slug, l.length_m;

INSERT INTO canonical.schema_migration (version) VALUES ('004_path_legs') ON CONFLICT DO NOTHING;
