import { ParcelMap } from "./ParcelMap";
import Parcels from "../data/prc_hgt_bldg.geo.json";
import NhoodGeoms from "../data/nhoods.geo.json";
import { MainApp } from "./MainApp";

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen">
      <MainApp parcels={Parcels} nhoodGeoms={NhoodGeoms} />
    </div>
  );
}
