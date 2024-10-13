
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
select
p.blklot,
(array_agg(p.geometry))[1] as geometry,
(array_agg(p.gen_hght))[1] as gen_hght,
max(b.height) as height
from prc_hgt as p
left join osm_buildings_height as b
on ST_Intersects(p.geometry, b.geometry)
group by p.blklot;
create index idx_prc_hgt_bldg_geometry on prc_hgt_bldg using gist(geometry);
create index idx_prc_hgt_bldg_blklot on prc_hgt_bldg (blklot);


-- app queries
--------------



-- select
--   p.blklot,
--   max(nearby.height) as nearby_height
-- from 
-- 	(
-- 		select * from prc_hgt_bldg
-- 		order by blklot
-- 		limit 1000
-- 		offset 160000
-- 	) as p
-- join prc_hgt_bldg as nearby
-- on ST_DWithin(p.geometry, nearby.geometry, 10)
-- and p.blklot != nearby.blklot
-- group by p.blklot;

-- -------

-- select * from prc_hgt_bldg limit 10;


-- select height is null, count(*) from prc_hgt_bldg group by height is null;


-- select * from prc_hgt_assessor limit 10;



-- select * from parcel as p
-- join parcel as p2
-- on ST_Intersects(p.geometry, p2.geometry) and p.blklot != p2.blklot;


-- ---------------
-- -- PRC cleaning

-- -- goal: 121 km2






-- select
-- count(*) as "prc count",
-- sum(ST_area(geometry)) / (1000 * 1000) as "total area (km2)"
-- from prc_dedupe;



-- select * from prc where blklot='0311015';

-- select * from prc
-- join (
-- select * from prc where blklot = '0311015'
-- ) as my_office
-- on ST_DWithin(prc.geometry, my_office.geometry, 0);

-- -----------------------
-- -- neighborhing parcel built heights

-- create index idx_prc_hgt_assessor_geometry on prc_hgt_assessor using gist(geometry);

-- drop table prc_hgt_assessor_neighbor;
-- create table prc_hgt_assessor_neighbor as
-- select
--   p.blklot,
--   any_value(p.geometry) as geometry,
--   any_value(p.gen_hght) as gen_hght,
--   any_value(p.stories) as stories,
--   max(nearby.stories) as neighbor_stories
-- from prc_hgt_assessor as p
-- join prc_hgt_assessor as nearby
-- on ST_DWithin(p.geometry, nearby.geometry, 10)
-- and p.blklot != nearby.blklot
-- group by p.blklot;




-- select * from pg_indexes;