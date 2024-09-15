import { ParcelMap } from "./ParcelMap";

export const MainApp = ({ parcels }: { parcels: any }) => {
  return (
    <div style={{ width: "90%", height: "90%" }}>
      <div className="flex h-full">
        <div>
          <h2>Settings</h2>
          <p>Distance</p>
          <input />
          <p>Height multiple</p>
          <input />
        </div>
        <ParcelMap parcels={parcels} />
      </div>
    </div>
  );
};
