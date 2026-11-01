-- =============================================================================
-- 004 – model trasa > podtrasa > úsek (T2-06)
-- -----------------------------------------------------------------------------
-- route      = OSM relácia trasy (napr. EuroVelo 6) alebo trasa z rurAllure DS6
-- podtrasa   = route s vyplneným parent_id (OSM relácia vložená do nadradenej relácie)
-- úsek       = canonical.route_segment: súvislá čiara trasy v poradí seq
-- =============================================================================

ALTER TABLE canonical.route
    ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES canonical.route(id) ON DELETE SET NULL;

ALTER TABLE canonical.route DROP CONSTRAINT IF EXISTS route_parent_not_self;
ALTER TABLE canonical.route ADD CONSTRAINT route_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX IF NOT EXISTS route_parent_idx ON canonical.route (parent_id);

CREATE TABLE IF NOT EXISTS canonical.route_segment (
    id        serial PRIMARY KEY,
    route_id  integer NOT NULL REFERENCES canonical.route(id) ON DELETE CASCADE,
    seq       integer NOT NULL,
    geom      geometry(LineString, 4326) NOT NULL CHECK (ST_IsValid(geom)),
    UNIQUE (route_id, seq)
);
CREATE INDEX IF NOT EXISTS route_segment_geom_gix ON canonical.route_segment USING gist (geom);

INSERT INTO canonical.schema_migration (version) VALUES ('004_route_hierarchy') ON CONFLICT DO NOTHING;
