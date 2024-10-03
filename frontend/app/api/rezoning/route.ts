import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./db_client";

export async function GET(request: NextRequest) {
  const client = await createClient();

  const {
    nextUrl: { searchParams },
  } = request;

  if (!searchParams.has("distance") || !searchParams.has("heightMultiple")) {
    return NextResponse.json(
      { error: "distance and heightMultiple are required" },
      { status: 400 }
    );
  }

  const limit = searchParams.get("limit") ?? 1000000;
  const offset = searchParams.get("offset") ?? 0;

  const { rows } = await client.query(
    `

    WITH parcels_to_evaluate AS (
      SELECT
        p.blklot,
        p.height,
        ST_Area(ST_Transform(p.geometry, 2227)) AS area_sq_ft,
        p.geometry
      FROM
        (
          SELECT *
          FROM prc_hgt_bldg
          ORDER BY blklot
          LIMIT $3
          OFFSET $4
        ) AS p
    ),
    nearby_heights AS (
      SELECT
        p.blklot,
        MAX(p.height) as height,
        MAX(p.area_sq_ft) as area_sq_ft,
        MAX(nearby.height) AS nearby_height,
        MAX(nearby.height) * $2 AS new_zoned_height
      FROM parcels_to_evaluate p
      JOIN prc_hgt_bldg AS nearby
        ON ST_DWithin(p.geometry, nearby.geometry, $1)
        AND p.blklot != nearby.blklot
      GROUP BY p.blklot
    ),
    parcel_calculations AS (
    SELECT
      blklot,
      height,
      area_sq_ft,
      nearby_height,
      new_zoned_height,
      FLOOR((height - (CASE WHEN height <= 50 THEN 10 ELSE 15 END)) / 10) AS n_floors_residential_squo,
      FLOOR((new_zoned_height - (CASE WHEN new_zoned_height <= 50 THEN 10 ELSE 15 END)) / 10) AS n_floors_residential,
      CASE WHEN area_sq_ft / 43560 > 1 THEN 0.55 ELSE 0.75 END AS lot_coverage_discount,
      (area_sq_ft * (CASE WHEN area_sq_ft / 43560 > 1 THEN 0.55 ELSE 0.75 END)) AS ground_floor
    FROM nearby_heights
  ),
    capacity_calculations AS (
  SELECT
    pc.blklot,
    pc.nearby_height,
    pc.new_zoned_height,
    pc.n_floors_residential,
    (CASE
      WHEN pc.height <= 85 THEN 
        pc.ground_floor * pc.n_floors_residential_squo
      WHEN pc.height > 85 AND pc.area_sq_ft < 12000 THEN 
        pc.ground_floor * pc.n_floors_residential_squo
      WHEN pc.height > 85 AND pc.area_sq_ft < 45000 THEN 
        pc.ground_floor * 7 + 12000 * GREATEST(pc.n_floors_residential_squo - 7, 0)
      ELSE 
        pc.ground_floor * 7 + ROUND(pc.area_sq_ft / 43560) * 12000 * GREATEST(pc.n_floors_residential_squo - 7, 0)
    END * 0.8) / 1000 AS squo_capacity,
    (CASE
      WHEN pc.new_zoned_height <= 85 THEN 
        pc.ground_floor * pc.n_floors_residential
      WHEN pc.new_zoned_height > 85 AND pc.area_sq_ft < 12000 THEN 
        pc.ground_floor * pc.n_floors_residential
      WHEN pc.new_zoned_height > 85 AND pc.area_sq_ft < 45000 THEN 
        pc.ground_floor * 7 + 12000 * GREATEST(pc.n_floors_residential - 7, 0)
      ELSE 
        pc.ground_floor * 7 + ROUND(pc.area_sq_ft / 43560) * 12000 * GREATEST(pc.n_floors_residential - 7, 0)
    END * 0.8) / 1000 AS new_capacity
  FROM parcel_calculations pc
  )
  select blklot,
         nearby_height, 
         new_zoned_height, 
         CASE WHEN new_capacity < squo_capacity THEN 0 ELSE ROUND(new_capacity - squo_capacity) END as added_capacity
  FROM capacity_calculations
  ;
  `,
    [
      searchParams.get("distance"),
      searchParams.get("heightMultiple"),
      limit,
      offset,
    ]
  );

  client.end();
  console.log("API Response Rows:", rows);

  return NextResponse.json({ rezonedParcels: rows }, { status: 200 });
}
