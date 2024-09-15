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
    select
      p.blklot,
      max(nearby.height) as nearby_height,
      max(nearby.height) * $2 as new_zoned_height
    from 
      (
        select * from prc_hgt_bldg
        order by blklot
        limit $3
        offset $4
      ) as p
    join prc_hgt_bldg as nearby
      on ST_DWithin(p.geometry, nearby.geometry, $1)
      and p.blklot != nearby.blklot
    group by p.blklot;
  `,
    [
      searchParams.get("distance"),
      searchParams.get("heightMultiple"),
      limit,
      offset,
    ]
  );

  client.end();

  return NextResponse.json({ rezonedParcels: rows }, { status: 200 });
}
