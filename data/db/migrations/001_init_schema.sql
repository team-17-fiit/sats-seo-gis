-- =============================================================================
-- 001 – kanonická schéma key-locations DB (šprint 1-1Z, T1-07)
-- -----------------------------------------------------------------------------
-- Medallion: staging (surové riadky podľa zdroja) -> canonical (vyčistené, s licenciou)
--            -> marts (pohľady pre SSG/BI). Odmietnuté riadky idú do quarantine.
-- Idempotentné: dá sa spustiť opakovane (IF NOT EXISTS).
-- Doména "geografia a trasy". Quiz, check-in, users, metriky pribudnú v ďalších migráciách.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS canonical;
CREATE SCHEMA IF NOT EXISTS quarantine;
CREATE SCHEMA IF NOT EXISTS marts;

CREATE TABLE IF NOT EXISTS canonical.schema_migration (
    version    text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Proveniencia (US-11): každý dátový riadok odkazuje na source + licence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical.licence (
    id           smallserial PRIMARY KEY,
    code         text NOT NULL UNIQUE,            -- ODbL-1.0, CC-BY-4.0, CC0-1.0, PD, PROPRIETARY
    name         text NOT NULL,
    url          text,
    share_alike  boolean NOT NULL DEFAULT false,
    attribution  text,                            -- text, ktorý musí byť zobrazený
    public_ok    boolean NOT NULL DEFAULT true    -- smie ísť do verejných stránok/dlaždíc
);

CREATE TABLE IF NOT EXISTS canonical.source (
    id          smallserial PRIMARY KEY,
    code        text NOT NULL UNIQUE,             -- osm, geonames, rurallure_ds1, …
    name        text NOT NULL,
    url         text,
    licence_id  smallint NOT NULL REFERENCES canonical.licence(id),
    fetched_at  timestamptz,
    sha256      text
);

-- ---------------------------------------------------------------------------
-- Geografia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical.admin_area (
    id          serial PRIMARY KEY,
    code        text NOT NULL UNIQUE,             -- ISO 3166 (SK, SK-BC, …)
    name        text NOT NULL,
    level       smallint NOT NULL CHECK (level IN (0, 1)),  -- 0 = štát, 1 = kraj
    geom        geometry(MultiPolygon, 4326) NOT NULL,
    source_id   smallint NOT NULL REFERENCES canonical.source(id),
    licence_id  smallint NOT NULL REFERENCES canonical.licence(id)
);
CREATE INDEX IF NOT EXISTS admin_area_geom_gix ON canonical.admin_area USING gist (geom);

CREATE TABLE IF NOT EXISTS canonical.geonames_place (
    geonameid      bigint PRIMARY KEY,
    name           text NOT NULL,
    asciiname      text,
    feature_class  char(1),
    feature_code   text,
    admin1         text,
    population     bigint,
    elevation      integer,
    geom           geometry(Point, 4326) NOT NULL,
    source_id      smallint NOT NULL REFERENCES canonical.source(id),
    licence_id     smallint NOT NULL REFERENCES canonical.licence(id)
);
CREATE INDEX IF NOT EXISTS geonames_place_geom_gix ON canonical.geonames_place USING gist (geom);
CREATE INDEX IF NOT EXISTS geonames_place_name_trgm ON canonical.geonames_place USING gin (asciiname gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Piloty a trasy (pilot 1:N path 1:N path_segment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical.pilot (
    code     char(1) PRIMARY KEY CHECK (code IN ('A', 'B', 'C')),
    name_sk  text NOT NULL,
    name_en  text NOT NULL
);

CREATE TABLE IF NOT EXISTS canonical.path (
    id          serial PRIMARY KEY,
    slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name_sk     text NOT NULL,
    name_en     text NOT NULL,
    theme       text NOT NULL,                    -- active, wine, heritage, pilgrimage, wildlife, cycling, museums
    pilot_code  char(1) NOT NULL REFERENCES canonical.pilot(code),
    difficulty  text NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'mixed')),
    length_km   numeric(7, 1),
    colour      text CHECK (colour ~ '^#[0-9a-fA-F]{6}$'),
    mark        text,                             -- značenie v teréne
    summary_sk  text,
    summary_en  text,
    source_id   smallint NOT NULL REFERENCES canonical.source(id),
    licence_id  smallint NOT NULL REFERENCES canonical.licence(id),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canonical.path_segment (
    id          serial PRIMARY KEY,
    path_id     integer NOT NULL REFERENCES canonical.path(id) ON DELETE CASCADE,
    seq         integer NOT NULL,
    surface     text,
    geom        geometry(LineString, 4326) NOT NULL CHECK (ST_IsValid(geom)),
    source_id   smallint NOT NULL REFERENCES canonical.source(id),
    licence_id  smallint NOT NULL REFERENCES canonical.licence(id),
    UNIQUE (path_id, seq)
);
CREATE INDEX IF NOT EXISTS path_segment_geom_gix ON canonical.path_segment USING gist (geom);

-- ---------------------------------------------------------------------------
-- POI – kanonický model (tier T1 flagship, T2 notable, T3 služby do 2 km)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical.poi (
    id              bigserial PRIMARY KEY,
    slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name_sk         text NOT NULL,
    name_en         text,
    category        text NOT NULL,                -- castle, cave, peak, church, museum, spa, viewpoint, …
    tier            smallint NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 3),
    status          text NOT NULL DEFAULT 'imported' CHECK (status IN
                    ('imported', 'candidate', 'in_review', 'approved', 'rejected',
                     'published', 'stale', 'archived', 'discarded')),
    quality_score   smallint CHECK (quality_score BETWEEN 0 AND 100),
    unesco          boolean NOT NULL DEFAULT false,
    elevation_m     integer,
    osm_id          text,                         -- n123 / w456 / r789
    wikidata_id     text CHECK (wikidata_id ~ '^Q[0-9]+$'),
    geonameid       bigint,
    description_sk  text,
    description_en  text,
    website         text,
    geom            geometry(Point, 4326) NOT NULL CHECK (ST_IsValid(geom)),
    source_id       smallint NOT NULL REFERENCES canonical.source(id),
    licence_id      smallint NOT NULL REFERENCES canonical.licence(id),
    fetched_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poi_geom_gix ON canonical.poi USING gist (geom);
CREATE INDEX IF NOT EXISTS poi_geog_gix ON canonical.poi USING gist ((geom::geography));
CREATE INDEX IF NOT EXISTS poi_name_trgm ON canonical.poi USING gin (name_sk gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS poi_osm_id_uq ON canonical.poi (osm_id) WHERE osm_id IS NOT NULL;

-- poi M:N path (zastávka na trase alebo odbočka)
CREATE TABLE IF NOT EXISTS canonical.poi_path (
    poi_id     bigint  NOT NULL REFERENCES canonical.poi(id) ON DELETE CASCADE,
    path_id    integer NOT NULL REFERENCES canonical.path(id) ON DELETE CASCADE,
    role       text NOT NULL DEFAULT 'stop' CHECK (role IN ('stop', 'on_path', 'detour')),
    seq        integer,                           -- poradie zastávky
    detour_km  numeric(6, 2),
    PRIMARY KEY (poi_id, path_id)
);

-- ---------------------------------------------------------------------------
-- OSM trasy (route=hiking|bicycle|foot|…) a ich zdieľanie s našimi trasami
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical.route (
    id               serial PRIMARY KEY,
    osm_relation_id  bigint UNIQUE,
    name             text,
    route_type       text NOT NULL,
    network          text,
    ref              text,
    colour           text,
    geom             geometry(MultiLineString, 4326),
    source_id        smallint NOT NULL REFERENCES canonical.source(id),
    licence_id       smallint NOT NULL REFERENCES canonical.licence(id)
);
CREATE INDEX IF NOT EXISTS route_geom_gix ON canonical.route USING gist (geom);

CREATE TABLE IF NOT EXISTS canonical.route_path (
    route_id   integer NOT NULL REFERENCES canonical.route(id) ON DELETE CASCADE,
    path_id    integer NOT NULL REFERENCES canonical.path(id) ON DELETE CASCADE,
    share_pct  numeric(5, 2) CHECK (share_pct BETWEEN 0 AND 100),
    PRIMARY KEY (route_id, path_id)
);

-- ---------------------------------------------------------------------------
-- Staging (tvar podľa zdroja). OSM tabuľky vytvára osm2pgsql (data/osm/flex.lua).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staging.rurallure_ds1 (
    id          serial PRIMARY KEY,
    ext_id      text NOT NULL,
    name        text,
    category    text,
    description text,
    lat         double precision,
    lon         double precision,
    raw         jsonb NOT NULL,
    file        text NOT NULL,
    loaded_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (file, ext_id)
);

CREATE TABLE IF NOT EXISTS staging.rurallure_ds6 (
    id          serial PRIMARY KEY,
    ext_id      text NOT NULL,
    name        text,
    geom        geometry(MultiLineString, 4326),
    raw         jsonb NOT NULL,
    file        text NOT NULL,
    loaded_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (file, ext_id)
);

-- ---------------------------------------------------------------------------
-- Karanténa: čo neprešlo validáciou alebo licenčnou bránou
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quarantine.rejected_row (
    id           bigserial PRIMARY KEY,
    source_code  text NOT NULL,
    ext_id       text,
    reason       text NOT NULL,
    payload      jsonb,
    rejected_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO canonical.schema_migration (version) VALUES ('001_init_schema') ON CONFLICT DO NOTHING;
