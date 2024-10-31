import Highcharts, { animate } from "highcharts";
import HighchartsReact, {
  HighchartsReactProps,
} from "highcharts-react-official";
import { useState } from "react";

export const NhoodChart = ({
  capacityByNhood,
}: {
  capacityByNhood: Record<string, number>;
}) => {
  const [showAll, setShowAll] = useState(true);
  if (Object.keys(capacityByNhood).length === 0) {
    return null;
  }

  const sortedCapacityByNhood = Object.entries(capacityByNhood)
    .sort(([, a], [, b]) => b - a)
    .slice(0, showAll ? undefined : 20);

  // bar chart
  const options: HighchartsReactProps = {
    chart: {
      type: "bar",
      // TODO: make this take up the full height
      height: Math.max(300, sortedCapacityByNhood.length * 40),
    },
    title: {
      text: "",
    },
    xAxis: {
      categories: sortedCapacityByNhood.map(([nhood]) => nhood),
      labels: {
        formatter: function (): string {
          if (this.value.length > 12) {
            return this.value.slice(0, 12) + "...";
          }

          return this.value;
        },
      },
      // labels: {
      //   style: {
      //     wordBreak: "break-all",
      //     maxWidth: "50px",
      //     whiteSpace: "normal",
      //   },
      // },
    },
    yAxis: {
      min: 0,
      title: {
        text: "Capacity (units)",
      },
    },
    series: [
      {
        name: "Capacity",
        data: sortedCapacityByNhood.map(([, capacity]) => capacity),
        animation: false,
      },
    ],
  };

  return (
    <div className="border rounded p-4 shadow">
      <div className="flex">
        <p className="text-lg font-semibold">Capacity by neighborhood</p>
        <button
          onClick={() => setShowAll(!showAll)}
          className="ml-2"
          disabled={Object.keys(capacityByNhood).length === 0}
        >
          {showAll ? "Hide" : "Show all"}
        </button>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
