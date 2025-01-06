"use client";
import { DeckGL } from "@deck.gl/react";
import {
  BitmapLayer,
  GeoJsonLayer,
  PickingInfo,
  TextLayer,
  TileLayer,
} from "deck.gl";
import { FeatureCollection, Feature, MultiPolygon } from "geojson";
import { memo, useCallback, useMemo } from "react";
import chroma from "chroma-js";
import { RezonedParcel } from "./types";

type ParcelData = {
  blklot: string;
  height: number;
  zoned_height: number;
  added_capacity?: number;
  nearbyHeight?: number;
  newZonedHeight?: number;
};

const COLOR_SCALE = chroma.scale(["#3beb6a", "#3bb3eb"]);

const storiesFromHeight = (height: number) => {
  return Math.floor(height / 10);
};

const getColorForCapacityAdded = (
  unitsAdded: number
): [number, number, number] => {
  if (unitsAdded < 1) {
    return [220, 220, 220];
  }

  const clamped = Math.min(50, Math.max(0, unitsAdded));
  return COLOR_SCALE(clamped / 50).rgb();
};

type Parcel = Feature<MultiPolygon, ParcelData>;

export type Parcels = FeatureCollection<MultiPolygon, ParcelData>;

function getPolygonCentroid(p: MultiPolygon) {
  const pts = p.coordinates[0][0].map((coord) => ({
    x: coord[0],
    y: coord[1],
  }));
  const first = pts[0],
    last = pts[pts.length - 1];
  if (first.x != last.x || first.y != last.y) pts.push(first);
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

export const ParcelMap = memo(function ParcelMap({
  parcels,
  nhoodGeoms,
  rezonedParcels,
  is3D,
  showNhoodOverlay,
  exaggeratedHeights,
}: {
  parcels: Parcels;
  nhoodGeoms: FeatureCollection<MultiPolygon, { nhood: string }>;
  rezonedParcels: { [blklot: string]: RezonedParcel } | null;
  is3D: boolean;
  showNhoodOverlay: boolean;
  exaggeratedHeights: boolean;
}) {
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

  const nhoodLayer = new GeoJsonLayer({
    id: "NhoodLayer",
    data: nhoodGeoms["features"].map(
      (nhood: Feature<MultiPolygon, { nhood: string }>) => ({
        ...nhood,
        properties: { name: nhood.properties.nhood },
      })
    ),
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
    parameters: {
      depthTest: false,
    },
    getPosition: (d) => d.position,
    getText: (d) => d.name,
    sizeUnits: "meters",
    getSize: 100,
    sizeMaxPixels: 25,
    getColor: [0, 0, 0, 200],
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
  });

  let data: Parcel[];
  if (rezonedParcels) {
    data = parcels["features"].map((parcel: Parcel): Parcel => {
      const rezonedParcel = rezonedParcels[parcel.properties.blklot];
      if (rezonedParcel) {
        return {
          ...parcel,
          properties: {
            ...parcel.properties,
            nearbyHeight: rezonedParcel.nearby_height,
            newZonedHeight: rezonedParcel.new_zoned_height,
            added_capacity: rezonedParcel.added_capacity,
          },
        };
      }
      return parcel;
    });
  } else {
    data = parcels["features"];
  }
  data = data.filter((parcel) => parcel.properties.nearbyHeight);

  const parcelLayer = new GeoJsonLayer<ParcelData>({
    id: "ParcelLayer",
    data,
    filled: true,
    getFillColor: (f: Parcel) => {
      if (f.properties.newZonedHeight) {
        return [
          ...getColorForCapacityAdded(f.properties.added_capacity ?? 0),
          200,
        ];
      }
      return [150, 150, 150, 200];
    },
    extruded: is3D,
    wireframe: true,
    // height is in feet, convert to meters
    getElevation: (f: Parcel) =>
      (f.properties.height / 3.28084) * (exaggeratedHeights ? 5 : 1),
    getText: (f: Parcel) =>
      `zoned: ${f.properties.zoned_height}; actual: ${f.properties.height}`,
    pickable: true,
  });

  const getTooltip = useCallback((info: PickingInfo<Parcel>) => {
    let text = null;
    if (info.object) {
      text = `zoned: ${info.object.properties.zoned_height}ft`;
      text += `\nbuilt: ${Math.round(info.object.properties.height || 0)}ft`;

      if (info.object.properties.newZonedHeight) {
        text += `\ntallest built nearby: ${Math.round(
          info.object.properties.nearbyHeight || 0
        )}ft`;
        text += `\nnew zoning height: ${Math.round(
          info.object.properties.newZonedHeight || 0
        )}ft`;
        text += `\nzoning height increase: ${storiesFromHeight(
          info.object.properties.newZonedHeight -
            info.object.properties.zoned_height
        )} stories`;
        text += `\nincreased zoning capacity: ${Math.round(
          info.object.properties.added_capacity || 0
        )} units`;
      }

      text += `\n\nblklot: ${info.object.properties.blklot}`;
    }
    return text;
  }, []);

  const layers = useMemo(() => {
    const ls = [tileLayer, parcelLayer];
    if (showNhoodOverlay) {
      ls.push(nhoodLayer);
      ls.push(textLayer);
    }
    return ls;
  }, [tileLayer, parcelLayer, nhoodLayer, textLayer, showNhoodOverlay]);

  return (
    // 85vh is a little lazy but works well enough
    <div className="relative flex-1">
      <DeckGL
        initialViewState={{
          longitude: -122.44385,
          latitude: 37.75762,
          zoom: 12,
        }}
        controller
        layers={layers}
        getTooltip={getTooltip}
      ></DeckGL>
    </div>
  );
});
