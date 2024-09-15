"use client";
import { useState } from "react";
import { ParcelMap } from "./ParcelMap";
import _, { set } from "lodash";
import next from "next";

const MAX_INFLIGHT = 4;
const BATCH_SIZE = 10000;

const APPROX_NUM_PARCELS = 160000;

export const MainApp = ({ parcels }: { parcels: any }) => {
  const [distance, setDistance] = useState("10");
  const [heightMultiple, setHeightMultiple] = useState("1.3");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const [rezoneInProgress, setRezoneInProgress] = useState(false);
  const [rezonedParcels, setRezonedParcels] = useState<null | {
    [blklot: string]: RezonedParcel;
  }>(null);

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
    let nextOffset = 0;
    let lastPageFetched = false;

    setRezoneInProgress(true);
    setRezonedParcels({});
    while (!lastPageFetched || inflightCount > 0) {
      if (inflightCount < MAX_INFLIGHT && !lastPageFetched) {
        console.log("firing at offset", nextOffset);
        fetch(
          `/api/rezoning?distance=${distance}&heightMultiple=${heightMultiple}&limit=${BATCH_SIZE}&offset=${nextOffset}`
        ).then(async (response) => {
          console.log("got response", response);
          const body = await response.json();
          setRezonedParcels((prev) => {
            return { ...prev, ..._.keyBy(body.rezonedParcels, "blklot") };
          });
          inflightCount -= 1;
          if (body.rezonedParcels.length === 0) {
            lastPageFetched = true;
          }
        });
        nextOffset += BATCH_SIZE;
        // TODO: actually figure this out
        // if (nextOffset >= 160000) {
        //   lastPageFetched = true;
        // }
        inflightCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    setRezoneInProgress(false);
  };

  return (
    <div style={{ width: "90%", height: "90%" }}>
      <div className="flex h-full gap-8">
        <div className="flex flex-col gap-4">
          <h2>Settings</h2>
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
        </div>
        <ParcelMap parcels={parcels} rezonedParcels={rezonedParcels} />
      </div>
    </div>
  );
};
