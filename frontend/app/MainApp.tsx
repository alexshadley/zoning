"use client";
import { useState } from "react";
import { useEffect } from "react";
import Image from "next/image";

import { ParcelMap, Parcels } from "./ParcelMap";
import _ from "lodash";
import { NhoodChart } from "./NhoodChart";
import { NhoodSelector } from "./NhoodSelector";
import { AllNhoods, RezonedParcel } from "./types";
import { ParcelHistogram } from "./ParcelHistogram";
import TwitterShareButton from "./TwitterShareButton";
import { FeatureCollection, MultiPolygon } from "geojson";

const MAX_INFLIGHT = 4;

const DefaultNhoods = [
  "Outer Richmond",
  "Inner Richmond",
  "Inner Sunset",
  "Sunset/Parkside",
  "Seacliff",
  "West of Twin Peaks",
];

export const MainApp = ({
  parcels,
  nhoodGeoms,
}: {
  parcels: Parcels;
  nhoodGeoms: FeatureCollection<MultiPolygon, { nhood: string }>;
}) => {
  const [urlParamsRead, setUrlParamsRead] = useState(false);

  const [showHelpScreen, setShowHelpScreen] = useState(false);

  // zoning settings
  const [distance, setDistance] = useState("10");
  const [heightMultiple, setHeightMultiple] = useState("1.3");
  const [selectedNhoods, setSelectedNhoods] = useState<string[]>([
    ...DefaultNhoods,
  ]);
  const [localHeight, setLocalHeight] = useState("max");
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
  const [is3D, setIs3D] = useState(true);
  const [showNhoodOverlay, setShowNhoodOverlay] = useState(true);
  const [showExaggeratedHeights, setShowExaggeratedHeights] = useState(false);

  const [layout, setLayout] = useState<"mobile" | "desktop">("desktop");

  // Track window size
  useEffect(() => {
    const handleResize = () => {
      const lg = 1024;

      if (window.innerWidth >= lg) {
        setLayout("desktop");
      } else {
        setLayout("mobile");
        setIs3D(false);
      }
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const selectedNhoods = params
        .get("selectedNhoods")
        ?.split(",")
        .map((n) => AllNhoods[parseInt(n)]);
      const distance = params.get("distance");
      const heightMultiple = params.get("heightMultiple");

      if (selectedNhoods) {
        setSelectedNhoods(selectedNhoods);
      }
      if (distance) {
        setDistance(distance);
      }
      if (heightMultiple) {
        setHeightMultiple(heightMultiple);
      }

      setUrlParamsRead(true);
    } catch {
      console.log("error parsing url");
    }
  }, []);

  useEffect(() => {
    if (!urlParamsRead) {
      return;
    }

    const selectedNhoodsStr = selectedNhoods
      .map((n) => AllNhoods.indexOf(n))
      .join(",");

    const params = new URLSearchParams({
      distance,
      heightMultiple,
      localHeight,
      selectedNhoods: selectedNhoodsStr,
    });
    window.history.replaceState({}, "", `?${params.toString()}`);
  }, [selectedNhoods, distance, heightMultiple, urlParamsRead, localHeight]);

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
    const nhoodsToFetch = [...selectedNhoods];

    setRezoneInProgress(true);
    setRezoningProgress(0.0);
    setRezonedParcels({});
    setNominalCapacity(0);
    setCapacityByNhood({});
    while (nhoodsToFetch.length > 0 || inflightCount > 0) {
      if (inflightCount < MAX_INFLIGHT && nhoodsToFetch.length > 0) {
        const nextNhood = nhoodsToFetch.pop()!;
        console.log("fetch nhood", nextNhood);
        fetch(
          `/api/rezoning?distance=${distance}&heightMultiple=${heightMultiple}&nhood=${nextNhood}&localHeight=${localHeight}`
        ).then(async (response) => {
          const body = await response.json();

          setRezonedParcels((prev) => {
            const updated = { ...prev, ..._.keyBy(body.rezonedParcels, "blklot") };
            const updatedArray = Object.values(updated) as RezonedParcel[];

          
            // find lots with biggest contribution to zoning cap
            const capacityGtZero = updatedArray.filter((p) => p.added_capacity > 0).length;
            const capacityGteOne = updatedArray.filter((p) => p.added_capacity >= 1).length;
            const uniqueBlklotCount = new Set(updatedArray.map((p) => p.blklot)).size;
            const totalAddedCapacity = updatedArray.reduce((sum, p) => sum + p.added_capacity, 0);
            const top10 = [...updatedArray]
            .sort((a, b) => b.added_capacity - a.added_capacity)
            .slice(0, 10);
        
          // Print blocklots + added units
          console.log(
            `<< [${nextNhood}] Top 10 blocklots by added_capacity:`,
            top10.map((p) => ({
              blklot: p.blklot,
              added_capacity: p.added_capacity,
            }))
          );
            console.log(`<< [${nextNhood}] updated rezonedParcels count: ${updatedArray.length}`);
            console.log(`<< [${nextNhood}] # with added_capacity > 0: ${capacityGtZero}`);
            console.log(`<< [${nextNhood}] # with added_capacity >= 1: ${capacityGteOne}`);
            console.log(`<< [${nextNhood}] # of unique blocklots: ${uniqueBlklotCount}`);
            console.log(`<< [${nextNhood}] sum of updated added_capacity: ${totalAddedCapacity}`);

            return updated;
          });

          const capacity = body.rezonedParcels.reduce(
            (total: number, parcel: RezonedParcel) => {
              return total + parcel.added_capacity;
            },
            0
          );
          console.log(`<< [${nextNhood}] capacity from parcels:`, capacity);

          setCapacityByNhood((prev) => ({ ...prev, [nextNhood]: capacity }));
          setNominalCapacity((prev) => prev + capacity);
          inflightCount -= 1;
          setRezoningProgress(
            (selectedNhoods.length - nhoodsToFetch.length - inflightCount) /
              selectedNhoods.length
          );
        });
        inflightCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    setRezoneInProgress(false);
  };

  const progressMeter = rezoneInProgress && rezonedParcels && (
    <div className="w-full h-2" style={{ backgroundColor: "lightgray" }}>
      <div
        className="h-full"
        style={{
          backgroundColor: "green",
          width: `${rezoningProgress * 100}%`,
          transition: "width 0.5s",
        }}
      ></div>
    </div>
  );

  return (
    <div className={layout === "desktop" ? "w-screen h-screen p-8" : "p-4"}>
      {showHelpScreen && (
        <>
          <div
            className="absolute z-10 w-full h-full"
            style={{ backgroundColor: "#000", opacity: 0.5 }}
          />
          <div
            className="absolute z-20 w-full h-full flex items-center justify-center flex-col gap-4"
            onClick={() => setShowHelpScreen(false)}
          >
            <Image
              src="/images/explainer.png"
              alt=""
              width={1894}
              height={922}
            />
            <button
              className="text-white bg-blue-500 px-2 py-1 rounded text-2xl"
              onClick={() => setShowHelpScreen(false)}
            >
              {"Let's upzone!"}
            </button>
          </div>
        </>
      )}
      <div className="flex justify-between gap-4" style={{ height: "5%" }}>
        <div className="flex gap-4 items-center">
          <div className="text-3xl mb-2">Contextual Upzoning Simulator</div>
          {layout === "desktop" && (
            <div
              className="cursor-pointer text-xl"
              onClick={() => setShowHelpScreen(true)}
            >
              
            </div>
          )}
        </div>
        <div>
          <TwitterShareButton />
        </div>
      </div>
      <div
        className={
          layout === "desktop" ? "flex gap-4" : "flex gap-4 flex-col-reverse"
        }
        style={layout === "desktop" ? { height: "95%" } : undefined}
      >
        <div className="flex flex-col gap-4 basis-1/5 overflow-y-auto">
          <div className="flex flex-col gap-4 border rounded p-4 shadow">
            <div className="flex justify-between">
              <p className="text-lg">Zoning settings</p>
              <div>
                {errorMessage && <p className="text-red-500">{errorMessage}</p>}
                <button
                  className="text-white bg-blue-500 px-3 py-1 rounded"
                  onClick={handleRezone}
                  disabled={rezoneInProgress}
                >
                  Rezone!
                </button>
              </div>
            </div>
            {/* Distance (m) */}
            <div>
              <label className="relative group">
                Distance (m)
                <span className="inline-block cursor-pointer ml-1 text-blue-500">
                  ℹ️
                  <span className="absolute hidden group-hover:block w-64 p-2 mt-1 bg-gray-700 text-white text-m rounded shadow-lg z-50">
                    This value controls what counts as a "nearby" building. Measured in meters, a distance of 100m is roughly a block; 
                    a distance of 50m is roughly half a block; and a distance of 1m limits you to adjacent lots.
                  </span>
                </span>
              </label>
              <input
                className="border rounded p-1 mt-1"
                value={distance}
                onChange={(e) => setDistance(e.currentTarget.value)}
              />
            </div>
            <div>
              <label className="relative group">
                Height multiple
                <span className="inline-block cursor-pointer ml-1 text-blue-500">
                  <span className="absolute hidden group-hover:block w-64 p-2 mt-1 bg-gray-700 text-white text-m rounded shadow-lg z-50">
                    Multiplies the reference height. A multiple of 1.5 on a reference height of 40 feet would imply
                    you could build up to 1.5 * 40 = 60 feet.
                  </span>
                </span>
              </label>
              <input
                className="border rounded p-1 mt-1"
                value={heightMultiple}
                onChange={(e) => setHeightMultiple(e.currentTarget.value)}
              />
            </div>
            <div>
              <label className="relative group">
                Reference height
                <span className="inline-block cursor-pointer ml-1 text-blue-500">
                  <span className="absolute hidden group-hover:block w-64 p-2 mt-1 bg-gray-700 text-white text-m rounded shadow-lg z-50">
                    This controls whether the upzoning is anchored to the maximum height of nearby buildings, the mean height, or the median height.
                  </span>
                </span>
              </label>
              <select
                className="border rounded p-1 mt-1"
                value={localHeight}
                onChange={(e) => setLocalHeight(e.currentTarget.value)}
              >
                <option value="max">max</option>
                <option value="mean">mean</option>
                <option value="median">median</option>
              </select>
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
            {progressMeter}
            
            <div>
            <p className="relative group">
            <span className="font-semibold">
              Nominal capacity
              <span className="inline-block cursor-pointer ml-1 text-blue-500">
                <span className="absolute hidden group-hover:block w-64 p-2 mt-1 bg-gray-700 text-white text-m rounded shadow-lg z-50">
                  This figure indicates how many extra 1,000-square-ft homes could physically fit into the newly created zoning capacity.
                  A word of caution: these homes may not be economically feasible to build. They're just no longer illegal to build.
                </span>
              </span>
            </span>
            : {nominalCapacity}
          </p>           
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
                disabled={layout === "mobile"}
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
        <div className="basis-1/5 flex flex-col gap-4 overflow-y-auto">
          <ParcelHistogram rezonedParcels={rezonedParcels ?? {}} />
          <NhoodChart capacityByNhood={capacityByNhood} />
        </div>
        <div
          className={layout === "desktop" ? "relative flex-1" : "relative"}
          style={layout === "mobile" ? { height: "60vh" } : undefined}
        >
          <ParcelMap
            parcels={parcels}
            nhoodGeoms={nhoodGeoms}
            rezonedParcels={rezonedParcels}
            is3D={is3D}
            showNhoodOverlay={showNhoodOverlay}
            exaggeratedHeights={showExaggeratedHeights}
          />
        </div>
        {layout === "mobile" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <button
                className="text-white bg-blue-500 px-3 py-1 rounded"
                onClick={handleRezone}
                disabled={rezoneInProgress}
              >
                Rezone!
              </button>
              <p>Nominal capacity: {nominalCapacity}</p>
            </div>
            {progressMeter}
          </div>
        )}
      </div>
    </div>
  );
};
