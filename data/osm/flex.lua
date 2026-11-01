-- =============================================================================
-- osm2pgsql flex štýl – OSM PBF -> staging.osm_poi, staging.osm_route, staging.osm_route_member  (T1-05, T2-06)
-- -----------------------------------------------------------------------------
-- Spustenie (cez pipelines.load_osm):
--   osm2pgsql -O flex -S data/osm/flex.lua -d $DATABASE_URL data/raw/slovakia-latest.osm.pbf
-- Berieme len to, čo projekt potrebuje (turizmus, dedičstvo, príroda, trasy),
-- nie celý OSM – staging ostáva malý a import rýchly.
-- Licencia výsledku: ODbL-1.0 (source 'osm'), pozri licenčný register.
-- =============================================================================

local tables = {}

tables.osm_poi = osm2pgsql.define_table({
    name = 'osm_poi',
    schema = 'staging',
    ids = { type = 'any', id_column = 'osm_id', type_column = 'osm_type' },
    columns = {
        { column = 'name',     type = 'text' },
        { column = 'name_en',  type = 'text' },
        { column = 'category', type = 'text', not_null = true },
        { column = 'wikidata', type = 'text' },
        { column = 'ele',      type = 'text' },
        { column = 'website',  type = 'text' },
        { column = 'tags',     type = 'jsonb' },
        { column = 'geom',     type = 'point', projection = 4326, not_null = true },
    },
})

tables.osm_route = osm2pgsql.define_table({
    name = 'osm_route',
    schema = 'staging',
    ids = { type = 'relation', id_column = 'osm_id' },
    columns = {
        { column = 'name',    type = 'text' },
        { column = 'route',   type = 'text', not_null = true },
        { column = 'network', type = 'text' },
        { column = 'ref',     type = 'text' },
        { column = 'colour',  type = 'text' },
        { column = 'tags',    type = 'jsonb' },
        { column = 'geom',    type = 'multilinestring', projection = 4326 },
    },
})

-- Podtrasy: relácia trasy, ktorá je členom inej relácie trasy (napr. etapa EuroVelo 6).
tables.osm_route_member = osm2pgsql.define_table({
    name = 'osm_route_member',
    schema = 'staging',
    ids = { type = 'relation', id_column = 'osm_id' },
    columns = {
        { column = 'member_id', type = 'int8', not_null = true },
        { column = 'seq',       type = 'int4', not_null = true },
    },
})

-- Mapovanie OSM tagov na kategóriu projektu. nil = nezaujíma nás.
local CATEGORY = {
    historic = {
        castle = 'castle', ruins = 'ruins', manor = 'manor', monument = 'monument',
        memorial = 'memorial', church = 'church', monastery = 'monastery',
        archaeological_site = 'archaeological_site', fort = 'fort',
    },
    tourism = {
        attraction = 'attraction', museum = 'museum', gallery = 'museum',
        viewpoint = 'viewpoint', alpine_hut = 'hut', wilderness_hut = 'hut',
        picnic_site = 'picnic_site', camp_site = 'camp_site', zoo = 'zoo',
    },
    natural = {
        peak = 'peak', cave_entrance = 'cave', spring = 'spring',
        waterfall = 'waterfall', saddle = 'saddle', gorge = 'gorge',
    },
    amenity = {
        place_of_worship = 'church', shelter = 'shelter', drinking_water = 'drinking_water',
    },
    waterway = { waterfall = 'waterfall', dam = 'dam' },
    leisure = { nature_reserve = 'nature' },
}
-- Poradie kľúčov = priorita (historic vyhrá nad tourism, …)
local KEYS = { 'historic', 'natural', 'tourism', 'leisure', 'waterway', 'amenity' }

local ROUTE_TYPES = {
    hiking = true, foot = true, bicycle = true, mtb = true,
    horse = true, ski = true, canoe = true,
}

local function classify(tags)
    for _, key in ipairs(KEYS) do
        local value = tags[key]
        if value and CATEGORY[key][value] then
            return CATEGORY[key][value]
        end
    end
    -- púte: OSM route=pilgrimage na relácii, na bode pilgrimage=yes
    if tags.pilgrimage == 'yes' then return 'pilgrimage_site' end
    return nil
end

local function poi_row(object, geom)
    local category = classify(object.tags)
    if not category then return end
    tables.osm_poi:insert({
        name = object.tags.name,
        name_en = object.tags['name:en'],
        category = category,
        wikidata = object.tags.wikidata,
        ele = object.tags.ele,
        website = object.tags.website or object.tags['contact:website'],
        tags = object.tags,
        geom = geom,
    })
end

function osm2pgsql.process_node(object)
    poi_row(object, object:as_point())
end

function osm2pgsql.process_way(object)
    if not classify(object.tags) then return end
    -- plošné objekty (hrad, zoo) -> bod v strede
    local geom
    if object.is_closed then
        geom = object:as_polygon():centroid()
    else
        geom = object:as_linestring():centroid()
    end
    poi_row(object, geom)
end

function osm2pgsql.process_relation(object)
    local tags = object.tags
    if (tags.type == 'route' or tags.type == 'superroute')
        and (ROUTE_TYPES[tags.route] or tags.route == 'pilgrimage' or tags.pilgrimage == 'yes') then
        -- členovia typu relácia = podtrasy (poradie podľa poradia v relácii)
        local seq = 0
        for _, member in ipairs(object.members) do
            if member.type == 'r' then
                seq = seq + 1
                tables.osm_route_member:insert({ member_id = member.ref, seq = seq })
            end
        end
        tables.osm_route:insert({
            name = tags.name,
            route = tags.route,
            network = tags.network,
            ref = tags.ref,
            colour = tags.colour or tags['osmc:symbol'],
            tags = tags,
            geom = object:as_multilinestring(),
        })
    elseif tags.type == 'multipolygon' and classify(tags) then
        poi_row(object, object:as_multipolygon():centroid())
    end
end
