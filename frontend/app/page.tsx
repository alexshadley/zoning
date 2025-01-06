"use client";
import NhoodGeoms from "../data/nhoods.geo.json";
import { MainApp } from "./MainApp";
import { Parcels as ParcelsType } from "./ParcelMap";
import { FeatureCollection, MultiPolygon } from "geojson";
import { useEffect, useState } from "react";

export default function Home() {
  const [parcels, setParcels] = useState<ParcelsType | null>(null);

  useEffect(() => {
    // Load large GeoJSON file client-side
    import("../data/prc_hgt_bldg.geo.json").then((data) =>
      setParcels(data as unknown as ParcelsType)
    );
  }, []);

  if (!parcels) {
    // nice loading state
    return <div>Loading map data...</div>;
  }

  return (
    <MainApp
      parcels={parcels}
      nhoodGeoms={
        NhoodGeoms as FeatureCollection<MultiPolygon, { nhood: string }>
      }
    />
  );
}
