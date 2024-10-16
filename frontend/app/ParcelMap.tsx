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
  added_capacity?: number;
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
    nhoodGeoms,
    rezonedParcels,
    is3D,
    showNhoodOverlay,
  }: {
    parcels: any;
    nhoodGeoms: any;
    rezonedParcels: { [blklot: string]: RezonedParcel } | null;
    is3D: boolean;
    showNhoodOverlay: boolean;
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

    const nhoodLayer = new GeoJsonLayer({
      id: "NhoodLayer",
      data: nhoodGeoms["features"].map((nhood: any) => ({
        ...nhood,
        properties: { name: nhood.properties.nhood },
      })),
      filled: false,
      // lineWidthUnits: "pixels",
      getLineWidth: 5,
      getLineColor: [44, 175, 254, 200],
      lineWidthMinPixels: 3,
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
          const storiesIncrease = storiesFromHeight(
            f.properties.newZonedHeight - f.properties.zoned_height
          );
          return [...getColorForStories(storiesIncrease), 200];
        }
        return [150, 150, 150, 200];
      },
      extruded: is3D,
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
          text += `\nnew zoning capacity: ${Math.round(
            info.object.properties.added_capacity || 0
          )}`;
          text += `\nzoning height increase: ${storiesFromHeight(
            info.object.properties.newZonedHeight -
              info.object.properties.zoned_height
          )} stories`;
        }
      }
      return text;
    }, []);

    const layers = useMemo(() => {
      const ls = [tileLayer, parcelLayer];
      if (showNhoodOverlay) {
        ls.push(nhoodLayer);
      }
      return ls;
    }, [tileLayer, parcelLayer, nhoodLayer, showNhoodOverlay]);

    return (
      <div className="relative flex-1">
        <DeckGL
          initialViewState={{
            longitude: -122.4,
            latitude: 37.74,
            zoom: 11,
          }}
          controller
          layers={layers}
          getTooltip={getTooltip}
        />
      </div>
    );
  }
);
