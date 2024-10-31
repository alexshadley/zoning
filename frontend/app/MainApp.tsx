"use client";
import { useState } from "react";
import { useEffect } from "react";

import { ParcelMap } from "./ParcelMap";
import _, { set } from "lodash";
import next from "next";
import { NhoodChart } from "./NhoodChart";
import { NhoodSelector } from "./NhoodSelector";
import { AllNhoods, RezonedParcel } from "./types";
import { ParcelHistogram } from "./ParcelHistogram";

const MAX_INFLIGHT = 4;

const DefaultNhoods = [
  "Outer Richmond",
  "Inner Sunset",
  "Sunset/Parkside",
  "Seacliff",
  "West of Twin Peaks",
];

export const MainApp = ({
  parcels,
  nhoodGeoms,
}: {
  parcels: any;
  nhoodGeoms: any;
}) => {
  // zoning settings
  const [distance, setDistance] = useState("10");
  const [heightMultiple, setHeightMultiple] = useState("1.3");
  const [selectedNhoods, setSelectedNhoods] = useState<string[]>([
    ...DefaultNhoods,
  ]);

  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [nominalCapacity, setNominalCapacity] = useState(0);
  const [capacityByNhood, setCapacityByNhood] = useState<
    Record<string, number>
  >({});
  const [rezoneInProgress, setRezoneInProgress] = useState(false);
  const [rezonedParcels, setRezonedParcels] = useState<null | {
    [blklot: string]: RezonedParcel;
  }>(null);
  const [rezoningProgress, setRezoningProgress] = useState(0.0);

  // viz settings
  const [is3D, setIs3D] = useState(false);
  const [showNhoodOverlay, setShowNhoodOverlay] = useState(false);
  const [showExaggeratedHeights, setShowExaggeratedHeights] = useState(false);

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
    let nhoodsToFetch = [...selectedNhoods];

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
          setRezoningProgress(
            (selectedNhoods.length - nhoodsToFetch.length) /
              selectedNhoods.length
          );

          inflightCount -= 1;
        });
        inflightCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    setRezoneInProgress(false);
  };

  return (
    <div style={{ width: "calc(100vw - 50px)", height: "calc(100vh - 50px)" }}>
      <div className="flex h-full gap-4">
        <div className="flex flex-col gap-4 basis-1/5 overflow-y-scroll">
          <div className="flex flex-col gap-4 border rounded p-4 shadow">
            <div className="flex justify-between">
              <p className="text-lg">Zoning settings</p>
              <div>
                {errorMessage && <p className="text-red-500">{errorMessage}</p>}
                <button
                  className="text-white bg-blue-500 px-2 py-1 rounded"
                  onClick={handleRezone}
                  disabled={rezoneInProgress}
                >
                  Rezone!
                </button>
              </div>
            </div>
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
            <NhoodSelector
              selectedNhoods={selectedNhoods}
              toggleNhood={(nhood) =>
                setSelectedNhoods((prev) =>
                  prev.includes(nhood)
                    ? prev.filter((n) => n !== nhood)
                    : [...prev, nhood]
                )
              }
              onSelectAll={() => setSelectedNhoods([...AllNhoods])}
              onDeselectAll={() => setSelectedNhoods([])}
            />
            {rezoneInProgress && rezonedParcels && (
              <div
                className="w-full h-2"
                style={{ backgroundColor: "lightgray" }}
              >
                <div
                  className="h-full"
                  style={{
                    backgroundColor: "green",
                    width: `${rezoningProgress * 100}%`,
                    transition: "width 0.5s",
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
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="nhood-overlay"
                checked={showExaggeratedHeights}
                onChange={(e) =>
                  setShowExaggeratedHeights(e.currentTarget.checked)
                }
              />
              <p>Exaggerated building heights</p>
            </div>
          </div>
        </div>
        <div className="basis-1/5 flex flex-col gap-4 overflow-y-scroll">
          <ParcelHistogram rezonedParcels={rezonedParcels ?? {}} />
          <NhoodChart capacityByNhood={capacityByNhood} />
        </div>
        <ParcelMap
          parcels={parcels}
          nhoodGeoms={nhoodGeoms}
          rezonedParcels={rezonedParcels}
          is3D={is3D}
          showNhoodOverlay={showNhoodOverlay}
          exaggeratedHeights={showExaggeratedHeights}
        />
      </div>
    </div>
  );
};
