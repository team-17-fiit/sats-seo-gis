-- =============================================================================
-- 007 – staging pre Wikidata (S2-3, T2-07)
-- Riadky v tvare zdroja z extraktu data/raw/wikidata-sk-heritage.json (kap. 6.1, krok 3).
-- Licencia CC0 (zdroj 'wikidata' v 002); load_wikidata z nich dopĺňa canonical.poi.
-- =============================================================================

CREATE TABLE IF NOT EXISTS staging.wikidata_item (
    qid             text PRIMARY KEY CHECK (qid ~ '^Q[0-9]+$'),
    description_sk  text,
    description_en  text,
    image           text,                         -- P18, URL súboru na Wikimedia Commons
    website         text,                         -- P856
    unesco          boolean NOT NULL DEFAULT false, -- P1435 = Q9259 (svetové dedičstvo UNESCO)
    raw             jsonb NOT NULL,
    loaded_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO canonical.schema_migration (version) VALUES ('007_wikidata') ON CONFLICT DO NOTHING;
