"use client";

import NhoodGeoms from "../data/nhoods.geo.json";
import { MainApp } from "./MainApp";
import { Parcels as ParcelsType } from "./ParcelMap";
import { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { useEffect, useState } from "react";

type BuildingProps = {
  blklot: string;
};

type Buildings = FeatureCollection<Polygon | MultiPolygon, BuildingProps>;

export default function Home() {
  const [parcels, setParcels] = useState<ParcelsType | null>(null);
  const [buildings, setBuildings] = useState<Buildings | null>(null);

  // 1) Load parcels
  useEffect(() => {
    import("../data/prc_hgt_bldg.geo.json").then((data) =>
      setParcels(data as unknown as ParcelsType)
    );
  }, []);

  // 2) Load building footprints
  useEffect(() => {
    import("../data/buildings.geo.json").then((data) =>
      setBuildings(data as unknown as Buildings)
    );
  }, []);

  // 3) Check if still loading
  if (!parcels || !buildings) {
    return <div>Loading map data...</div>;
  }

  return (
    <MainApp
      parcels={parcels}
      buildings={buildings}
      nhoodGeoms={
        NhoodGeoms as FeatureCollection<MultiPolygon, { nhood: string }>
      }
    />
  );
}

