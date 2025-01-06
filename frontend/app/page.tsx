import Parcels from "../data/prc_hgt_bldg.geo.json";
import NhoodGeoms from "../data/nhoods.geo.json";
import { MainApp } from "./MainApp";
import { Parcels as ParcelsType } from "./ParcelMap";
import { FeatureCollection, MultiPolygon } from "geojson";

export default function Home() {
  return (
    <MainApp
      parcels={Parcels as ParcelsType}
      nhoodGeoms={
        NhoodGeoms as FeatureCollection<MultiPolygon, { nhood: string }>
      }
    />
  );
}
