"use client";
import { DeckGL } from "@deck.gl/react";
import {
  BitmapLayer,
  GeoJsonLayer,
  MapView,
  MapViewState,
  PickingInfo,
  TileLayer,
} from "deck.gl";
import type { TileLayerPickingInfo } from "@deck.gl/geo-layers";
import { Feature, Geometry } from "geojson";
import { memo, useCallback, useMemo } from "react";
import chroma from "chroma-js";

type ParcelData = {
  blklot: string;
  height: number;
  zoned_height: number;
  nearbyHeight?: number;
  newZonedHeight?: number;
};

const COLOR_SCALE = chroma.scale(["lightgray", "lightgreen"]);

const storiesFromHeight = (height: number) => {
  return Math.floor(height / 10);
};

const getColorForStories = (stories: number) => {
  const clamped = Math.min(10, Math.max(0, stories));
  return COLOR_SCALE(clamped / 10).rgb();
};

type Parcel = Feature<Geometry, ParcelData>;

export const ParcelMap = memo(
  ({
    parcels,
    rezonedParcels,
  }: {
    parcels: any;
    rezonedParcels: { [blklot: string]: RezonedParcel } | null;
  }) => {
    const tileLayer = new TileLayer({
      id: "TileLayer",
      data: "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
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
            },
          };
        }
        return parcel;
      });
    } else {
      data = parcels["features"];
    }
    console.log("data going in", data[0]);

    const parcelLayer = new GeoJsonLayer<ParcelData>({
      id: "ParcelLayer",
      data,
      filled: true,
      getFillColor: (f: Parcel) => {
        if (f.properties.newZonedHeight) {
          const storiesIncrease = storiesFromHeight(
            f.properties.newZonedHeight - f.properties.zoned_height
          );
          return [...getColorForStories(storiesIncrease), 200];
        }
        return [150, 150, 150, 200];
      },
      extruded: true,
      wireframe: true,
      getElevation: (f: Parcel) => f.properties.height,
      getText: (f: Parcel) =>
        `zoned: ${f.properties.zoned_height}; actual: ${f.properties.height}`,
      pickable: true,
    });

    const getTooltip = useCallback((info: PickingInfo<Parcel>) => {
      let text = null;
      if (info.object) {
        text = `zoned: ${info.object.properties.zoned_height}ft`;
        text += `\nbuilt: ${info.object.properties.height}ft`;

        if (info.object.properties.newZonedHeight) {
          text += `\ntallest built nearby: ${info.object.properties.nearbyHeight}ft`;
          text += `\nnew zoning height: ${info.object.properties.newZonedHeight}ft`;
          text += `\nzoning height increase: ${storiesFromHeight(
            info.object.properties.newZonedHeight -
              info.object.properties.zoned_height
          )} stories`;
        }
      }
      return text;
    }, []);

    return (
      <div className="relative flex-1">
        <DeckGL
          initialViewState={{
            longitude: -122.4,
            latitude: 37.74,
            zoom: 11,
          }}
          controller
          layers={[tileLayer, parcelLayer]}
          getTooltip={getTooltip}
        />
      </div>
    );
  }
);
