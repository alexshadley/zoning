
-- prc_dedupe
-- multiple parcels will exist with the same geometry
-- all parcels with the same geom will have the same mapblklot value
drop table if exists prc_dedupe;
create table prc_dedupe as
select distinct on (mapblklot) * from prc
where active = TRUE
and zoning_district not ilike '%PUBLIC%'
order by mapblklot, blklot;

-- prc_hgt
-- join prc and zoning_height
drop table if exists prc_hgt;
create table prc_hgt as
select
	p.blklot,
	-- stoopid postgres 15 doesn't have any_value()
	(array_agg(p.geometry))[1] as geometry,
	max(h.gen_hght) as gen_hght
from prc_dedupe as p
left join zoning_height as h
on ST_Intersects(p.geometry, h.geometry)
group by p.blklot;


-- osm_buildings_height
drop table if exists osm_buildings_height;
create table osm_buildings_height as
select
	geometry,
	-- also convert to feet
	regexp_replace(height, '( m|m)', '', 'g')::float * 3.28 as height
from osm_buildings;
create index idx_osm_buildings_height_geometry on osm_buildings_height using gist(geometry);


-- prc_hgt_bldg
-- now join in osm buildings
drop table if exists prc_hgt_bldg;
create table prc_hgt_bldg as
select distinct on (p.blklot)
	p.blklot,
	p.geometry,
	p.gen_hght,
	b.height
from prc_hgt as p
left join osm_buildings_height as b
	on ST_Intersects(p.geometry, b.geometry)
order by
	p.blklot asc,
	st_distance(st_centroid(p.geometry), st_centroid(b.geometry)) asc;
create index idx_prc_hgt_bldg_geometry on prc_hgt_bldg using gist(geometry);
create index idx_prc_hgt_bldg_blklot on prc_hgt_bldg (blklot);

