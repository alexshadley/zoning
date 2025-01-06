import Highcharts from "highcharts";
import HighchartsReact, {
  HighchartsReactProps,
} from "highcharts-react-official";
import { RezonedParcel } from "./types";
import HistogramModule from "highcharts/modules/histogram-bellcurve";
import _ from "lodash";

// BOOOOO highcharts get your shit together
if (typeof Highcharts === "object") {
  HistogramModule(Highcharts);
}

export const ParcelHistogram = ({
  rezonedParcels,
}: {
  rezonedParcels: {
    [blklot: string]: RezonedParcel;
  };
}) => {
  const bins = _.groupBy(
    Object.values(rezonedParcels).filter(
      (parcel) => parcel.added_capacity >= 1
    ),
    (parcel) => Math.floor(parcel.added_capacity)
  );

  const options: HighchartsReactProps = {
    title: {
      text: null,
    },
    xAxis: {
      title: { text: "Capacity (units)" },
    },
    yAxis: {
      title: {
        text: "Frequency",
      },
    },
    series: [
      {
        name: "Histogram",
        type: "histogram",
        data: _.range(0, 31).map((bin) => bins[bin]?.length ?? 0),
      },
    ],
  };

  return (
    <div className="border rounded p-4 shadow">
      <div className="flex">
        <p className="text-lg font-semibold">Capacity by parcel</p>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
