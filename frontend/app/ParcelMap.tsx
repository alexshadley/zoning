"use client";

import { DeckGL } from "@deck.gl/react";
import { BitmapLayer, GeoJsonLayer, TextLayer, TileLayer } from "deck.gl";
import { FeatureCollection, Feature, MultiPolygon, Polygon } from "geojson";
import { memo, useCallback, useMemo } from "react";
import chroma from "chroma-js";

// --------- Parcel Data Types ---------
type ParcelData = {
  blklot: string;
  height: number; // in feet
  zoned_height: number;
  added_capacity?: number;
  nearbyHeight?: number;
  newZonedHeight?: number;
};
export type Parcel = Feature<MultiPolygon, ParcelData>;
export type Parcels = FeatureCollection<MultiPolygon, ParcelData>;

// --------- RezonedParcel Type ---------
// Adjust fields to match what's actually in rezonedParcels
export type RezonedParcel = {
  nearby_height: number | null;
  new_zoned_height: number | null;
  added_capacity?: number | null;
};

// --------- Building Data Types ---------
type BuildingProps = {
  blklot: string;
  height?: number; // optional building height from OSM
  // ... other OSM properties ...
};
type BuildingFeature = Feature<Polygon | MultiPolygon, BuildingProps>;
type Buildings = FeatureCollection<Polygon | MultiPolygon, BuildingProps>;

// --------- Some Utility Functions ---------

function storiesFromHeight(height: number) {
  return Math.max(0, Math.floor(height / 10));
}

const COLOR_SCALE = chroma.scale(["#3beb6a", "#3bb3eb"]);
function getColorForCapacityAdded(unitsAdded: number): [number, number, number] {
  if (unitsAdded < 1) {
    return [220, 220, 220];
  }
  const clamped = Math.min(50, Math.max(0, unitsAdded));
  return COLOR_SCALE(clamped / 50).rgb() as [number, number, number];
}

// Helper to find a centroid for labeling neighborhoods
function getPolygonCentroid(p: MultiPolygon) {
  const pts = p.coordinates[0][0].map((coord) => ({ x: coord[0], y: coord[1] }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    pts.push(first);
  }
  let twicearea = 0,
    x = 0,
    y = 0,
    p1,
    p2,
    f;
  const nPts = pts.length;
  for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
    p1 = pts[i];
    p2 = pts[j];
    f = p1.x * p2.y - p2.x * p1.y;
    twicearea += f;
    x += (p1.x + p2.x) * f;
    y += (p1.y + p2.y) * f;
  }
  f = twicearea * 3;
  return [x / f, y / f];
}

// Build a dictionary of building footprints keyed by blklot
function buildBuildingDict(buildings: Buildings) {
  const dict = new Map<string, BuildingFeature>();
  for (const b of buildings.features) {
    if (b.properties?.blklot) {
      dict.set(b.properties.blklot, b);
    }
  }
  return dict;
}

export const ParcelMap = memo(function ParcelMap({
  parcels,
  buildings,
  nhoodGeoms,
  rezonedParcels,
  is3D,
  showNhoodOverlay,
  exaggeratedHeights,
}: {
  parcels: Parcels;
  buildings: Buildings;
  nhoodGeoms: FeatureCollection<MultiPolygon, { nhood: string }>;
  rezonedParcels: { [blklot: string]: RezonedParcel } | null;
  is3D: boolean;
  showNhoodOverlay: boolean;
  exaggeratedHeights: boolean;
}) {
  // 1) Build dictionary of building footprints keyed by blklot
  const buildingDict = useMemo(() => buildBuildingDict(buildings), [buildings]);

  // 2) Merge rezoned data into parcels, then filter out any that lack a valid nearbyHeight
  const mergedParcels = useMemo(() => {
    // If we don't have rezonedParcels at all, fallback to original parcels
    if (!rezonedParcels) {
      return parcels.features;
    }
    return parcels.features
      .map((parcel) => {
        const rp = rezonedParcels[parcel.properties.blklot];
        if (!rp) {
          // If no rezoned entry, just return the parcel as-is
          return parcel;
        }
        // Insert rezoned data (like nearby_height) into the parcel’s properties
        return {
          ...parcel,
          properties: {
            ...parcel.properties,
            nearbyHeight: rp.nearby_height ?? undefined,
            newZonedHeight: rp.new_zoned_height ?? undefined,
            added_capacity: rp.added_capacity ?? 0,
          },
        };
      })
      // Filter: Only keep those with a valid nearbyHeight
      .filter((p) => p.properties.nearbyHeight !== undefined);
  }, [parcels, rezonedParcels]);

  // 3) Depending on is3D, optionally replace geometry with building footprint
  const finalFeatures = useMemo(() => {
    return mergedParcels.map((parcel) => {
      // If not 3D, keep parcel geometry as is
      if (!is3D) {
        return parcel;
      }
      // Otherwise, see if there's a building footprint for this blklot
      const building = buildingDict.get(parcel.properties.blklot);
      if (building) {
        // Use building geometry, keep PARCEL properties for coloring & tooltip
        return {
          ...parcel,
          geometry: building.geometry,
        };
      }
      // If no building found, fallback to parcel geometry
      return parcel;
    });
  }, [mergedParcels, is3D, buildingDict]);

  // 4) Wrap final features in a valid FeatureCollection for Deck.GL
  const finalData: FeatureCollection<MultiPolygon, ParcelData> = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: finalFeatures,
    };
  }, [finalFeatures]);

  // 5) Create a base tile layer
  const tileLayer = new TileLayer({
    id: "TileLayer",
    data: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    maxZoom: 19,
    minZoom: 0,
    tileSize: 256,
    renderSubLayers: (props) => {
      const { boundingBox } = props.tile;
      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [
          boundingBox[0][0],
          boundingBox[0][1],
          boundingBox[1][0],
          boundingBox[1][1],
        ],
      });
    },
    pickable: false,
  });

  // 6) Main layer for parcels (or footprints if is3D)
  const parcelOrBuildingLayer = new GeoJsonLayer<ParcelData>({
    id: "ParcelLayer",
    data: finalData,
    filled: true,
    getFillColor: (f) => {
      // If newZonedHeight is set, color based on added_capacity
      if (f.properties.newZonedHeight) {
        return [...getColorForCapacityAdded(f.properties.added_capacity ?? 0), 200];
      }
      return [150, 150, 150, 200];
    },
    extruded: is3D,
    wireframe: true,
    // For extrusion, still using the *parcel's* height property
    // If you want to use the building's OSM height, you'd need to merge that property above
    getElevation: (f) =>
      (f.properties.height / 3.28084),
    pickable: true,
  });

  // 7) Neighborhood overlay layers
  const nhoodLayer = new GeoJsonLayer({
    id: "NhoodLayer",
    data: nhoodGeoms.features.map((nh) => ({
      ...nh,
      properties: { name: nh.properties.nhood },
    })),
    filled: false,
    lineWidthUnits: "meters",
    getLineWidth: 10,
    getLineColor: [0, 0, 0, 50],
    lineWidthMinPixels: 2,
  });

  const textLayer = new TextLayer({
    id: "text-layer",
    data: nhoodGeoms.features.map((feature) => ({
      position: getPolygonCentroid(feature.geometry),
      name: feature.properties.nhood,
    })),
    parameters: { depthTest: false },
    getPosition: (d) => d.position,
    getText: (d) => d.name,
    sizeUnits: "meters",
    getSize: 100,
    sizeMaxPixels: 25,
    getColor: [0, 0, 0, 200],
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
  });

  // 8) Combine layers
  const layers = useMemo(() => {
    const baseLayers = [tileLayer, parcelOrBuildingLayer];
    if (showNhoodOverlay) {
      baseLayers.push(nhoodLayer, textLayer);
    }
    return baseLayers;
  }, [tileLayer, parcelOrBuildingLayer, nhoodLayer, textLayer, showNhoodOverlay]);

  // 9) Tooltip logic
  const getTooltip = useCallback((info) => {
    if (!info.object) return null;
    const p = info.object.properties;
    let text = `zoned: ${p.zoned_height}ft\nbuilt: ${Math.round(p.height || 0)}ft`;
    if (p.newZonedHeight) {
      text += `\ntallest built nearby: ${Math.round(p.nearbyHeight || 0)}ft`;
      text += `\nnew zoning height: ${Math.round(p.newZonedHeight || 0)}ft`;
      text += `\nzoning height increase: ${storiesFromHeight(
        p.newZonedHeight - p.zoned_height
      )} stories`;
      text += `\nincreased zoning capacity: ${Math.round(p.added_capacity || 0)} units`;
    }
    text += `\n\nblklot: ${p.blklot}`;
    return text;
  }, []);

  return (
    <DeckGL
      initialViewState={{
        longitude: -122.44385,
        latitude: 37.75762,
        zoom: 12,
      }}
      controller
      layers={layers}
      getTooltip={getTooltip}
    />
  );
});
