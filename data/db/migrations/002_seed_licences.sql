-- =============================================================================
-- 002 – licencie, zdroje a piloty (strojová verzia licenčného registra, US-11)
-- Zdroj pravdy pre ľudí: docs/planning/data-licence-register.md – meniť spolu.
-- =============================================================================

INSERT INTO canonical.licence (code, name, url, share_alike, attribution, public_ok) VALUES
  ('ODbL-1.0',    'Open Database License 1.0',            'https://opendatacommons.org/licenses/odbl/1-0/', true,  '© OpenStreetMap contributors', true),
  ('CC-BY-4.0',   'Creative Commons Attribution 4.0',     'https://creativecommons.org/licenses/by/4.0/',  false, NULL, true),
  ('CC0-1.0',     'CC0 1.0 Public Domain Dedication',     'https://creativecommons.org/publicdomain/zero/1.0/', false, NULL, true),
  ('PD',          'Public domain',                        NULL,                                             false, NULL, true),
  ('PROPRIETARY', 'Partner data (LOI) – not public',      NULL,                                             false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, share_alike = EXCLUDED.share_alike,
  attribution = EXCLUDED.attribution, public_ok = EXCLUDED.public_ok;

INSERT INTO canonical.source (code, name, url, licence_id)
SELECT s.code, s.name, s.url, l.id
FROM (VALUES
  ('osm',           'OpenStreetMap (Geofabrik Slovakia extract)', 'https://download.geofabrik.de/europe/slovakia.html', 'ODbL-1.0'),
  ('naturalearth',  'Natural Earth 1:10m cultural',               'https://www.naturalearthdata.com/',                  'PD'),
  ('geonames',      'GeoNames dump SK',                            'https://www.geonames.org/',                          'CC-BY-4.0'),
  ('rurallure_ds1', 'rurAllure DS1 – POIs',                        'https://rurallure.eu/',                              'CC-BY-4.0'),
  ('rurallure_ds6', 'rurAllure DS6 – GPX/GeoJSON tracks',          'https://rurallure.eu/',                              'CC-BY-4.0'),
  ('wikidata',      'Wikidata',                                    'https://www.wikidata.org/',                          'CC0-1.0'),
  ('natura2000',    'EEA Natura 2000',                             'https://www.eea.europa.eu/',                         'CC-BY-4.0'),
  ('team_curated',  'SATS-SEO-GIS team curated data',              'https://github.com/Matus17/sats-seo-gis',            'CC-BY-4.0'),
  ('openfreemap',   'OpenFreeMap basemap (OSM-derived)',           'https://openfreemap.org/',                           'ODbL-1.0')
) AS s(code, name, url, licence_code)
JOIN canonical.licence l ON l.code = s.licence_code
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, licence_id = EXCLUDED.licence_id;

INSERT INTO canonical.pilot (code, name_sk, name_en) VALUES
  ('A', 'Pilot A – dedičstvo a aktívny turizmus', 'Pilot A – heritage and active tourism'),
  ('B', 'Pilot B – púte a múzeá',                 'Pilot B – pilgrimage and museums'),
  ('C', 'Pilot C – cezhraničné cyklotrasy',       'Pilot C – cross-border cycling')
ON CONFLICT (code) DO UPDATE SET name_sk = EXCLUDED.name_sk, name_en = EXCLUDED.name_en;

INSERT INTO canonical.schema_migration (version) VALUES ('002_seed_licences') ON CONFLICT DO NOTHING;
