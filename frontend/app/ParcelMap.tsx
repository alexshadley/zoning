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
import { useCallback, useMemo } from "react";

type PropertiesType = {
  height: number;
  zoned_height: number;
};

type Parcel = Feature<Geometry, PropertiesType>;

export const ParcelMap = ({ parcels }: { parcels: any }) => {
  console.log(parcels["features"][0]);

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

  const parcelLayer = new GeoJsonLayer<PropertiesType>({
    id: "ParcelLayer",
    data: parcels,
    filled: true,
    getFillColor: [255, 0, 0, 100],
    getText: (f: Parcel) =>
      `zoned: ${f.properties.zoned_height}; actual: ${f.properties.height}`,
    pickable: true,
  });

  const getTooltip = useCallback((info: PickingInfo<Parcel>) => {
    return info.object
      ? `zoned: ${info.object.properties.zoned_height}; actual: ${info.object.properties.height}`
      : null;
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
};
