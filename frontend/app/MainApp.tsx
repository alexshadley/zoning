"use client";
import { useState } from "react";
import { useEffect } from "react";

import { ParcelMap } from "./ParcelMap";
import _, { set } from "lodash";
import next from "next";
import { NhoodChart } from "./NhoodChart";

const MAX_INFLIGHT = 4;
const BATCH_SIZE = 10000;

const APPROX_NUM_PARCELS = 160000;

const nhoods = [
  "Western Addition",
  "West of Twin Peaks",
  "Visitacion Valley",
  "Twin Peaks",
  "South of Market",
  "Presidio Heights",
  "Presidio",
  "Potrero Hill",
  "Portola",
  "Pacific Heights",
  "Outer Richmond",
  "Outer Mission",
  "Sunset/Parkside",
  "Oceanview/Merced/Ingleside",
  "North Beach",
  "Noe Valley",
  "Lone Mountain/USF",
  "Lincoln Park",
  "Seacliff",
  "Nob Hill",
  "Mission Bay",
  "Mission",
  "Russian Hill",
  "Marina",
  "Lakeshore",
  "Tenderloin",
  "McLaren Park",
  "Japantown",
  "Inner Sunset",
  "Hayes Valley",
  "Haight Ashbury",
  "Golden Gate Park",
  "Inner Richmond",
  "Glen Park",
  "Financial District/South Beach",
  "Excelsior",
  "Chinatown",
  "Castro/Upper Market",
  "Bernal Heights",
  "Bayview Hunters Point",
  // We have some data cleaning to do here
  // "Treasure Island",
];

export const MainApp = ({
  parcels,
  nhoodGeoms,
}: {
  parcels: any;
  nhoodGeoms: any;
}) => {
  const [distance, setDistance] = useState("10");
  const [heightMultiple, setHeightMultiple] = useState("1.3");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [nominalCapacity, setNominalCapacity] = useState(0);
  const [capacityByNhood, setCapacityByNhood] = useState<
    Record<string, number>
  >({});
  const [rezoneInProgress, setRezoneInProgress] = useState(false);
  const [rezonedParcels, setRezonedParcels] = useState<null | {
    [blklot: string]: RezonedParcel;
  }>(null);
  const [is3D, setIs3D] = useState(false);
  const [showNhoodOverlay, setShowNhoodOverlay] = useState(false);

  const handleRezone = async () => {
    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum)) {
      setErrorMessage("Distance must be a number");
      return;
    }

    if (distanceNum <= 0 || distanceNum > 200) {
      return setErrorMessage("Distance must be between 0 and 200 meters");
    }
    setErrorMessage(null);

    let inflightCount = 0;
    let nhoodsToFetch = [...nhoods];

    setRezoneInProgress(true);
    setRezonedParcels({});
    setNominalCapacity(0);
    setCapacityByNhood({});
    while (nhoodsToFetch.length > 0 || inflightCount > 0) {
      if (inflightCount < MAX_INFLIGHT && nhoodsToFetch.length > 0) {
        const nextNhood = nhoodsToFetch.pop()!;
        console.log("fetch nhood", nextNhood);
        fetch(
          `/api/rezoning?distance=${distance}&heightMultiple=${heightMultiple}&nhood=${nextNhood}`
        ).then(async (response) => {
          const body = await response.json();

          setRezonedParcels((prev) => {
            return { ...prev, ..._.keyBy(body.rezonedParcels, "blklot") };
          });

          const capacity = body.rezonedParcels.reduce(
            (total: number, parcel: RezonedParcel) => {
              return total + parcel.added_capacity;
            },
            0
          );
          setCapacityByNhood((prev) => ({ ...prev, [nextNhood]: capacity }));
          setNominalCapacity((prev) => prev + capacity);

          inflightCount -= 1;
        });
        inflightCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    setRezoneInProgress(false);
  };

  return (
    <div style={{ width: "90%", height: "90%" }}>
      <div className="flex h-full gap-8">
        <div className="flex flex-col gap-8 basis-1/5">
          <div className="flex flex-col gap-4 border rounded p-4 shadow">
            <p className="text-lg">Zoning settings</p>
            <div>
              <p>Distance (m)</p>
              <input
                className="border rounded p-1"
                value={distance}
                onChange={(e) => setDistance(e.currentTarget.value)}
              />
            </div>
            <div>
              <p>Height multiple</p>
              <input
                className="border rounded p-1"
                value={heightMultiple}
                onChange={(e) => setHeightMultiple(e.currentTarget.value)}
              />
            </div>
            <div>
              {errorMessage && <p className="text-red-500">{errorMessage}</p>}
              <button onClick={handleRezone} disabled={rezoneInProgress}>
                Rezone!
              </button>
            </div>
            {rezoneInProgress && rezonedParcels && (
              <div
                className="w-full h-2"
                style={{ backgroundColor: "lightgray" }}
              >
                <div
                  className="h-full"
                  style={{
                    backgroundColor: "green",
                    width: `${
                      (Object.values(rezonedParcels).length * 100) /
                      APPROX_NUM_PARCELS
                    }%`,
                  }}
                ></div>
              </div>
            )}
            <div>
              <p>Nominal capacity: {nominalCapacity}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 border rounded p-4 shadow">
            <p className="text-lg">Visualization settings</p>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="3d"
                checked={is3D}
                onChange={(e) => setIs3D(e.currentTarget.checked)}
              />
              <p>3D map</p>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="nhood-overlay"
                checked={showNhoodOverlay}
                onChange={(e) => setShowNhoodOverlay(e.currentTarget.checked)}
              />
              <p>Neighborhood overlay</p>
            </div>
          </div>
        </div>
        <div className="basis-1/5">
          <NhoodChart capacityByNhood={capacityByNhood} />
        </div>
        <ParcelMap
          parcels={parcels}
          nhoodGeoms={nhoodGeoms}
          rezonedParcels={rezonedParcels}
          is3D={is3D}
          showNhoodOverlay={showNhoodOverlay}
        />
      </div>
    </div>
  );
};
