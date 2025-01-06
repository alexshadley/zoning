import Highcharts from "highcharts";
import HighchartsReact, {
  HighchartsReactProps,
} from "highcharts-react-official";

export const NhoodChart = ({
  capacityByNhood,
}: {
  capacityByNhood: Record<string, number>;
}) => {
  if (Object.keys(capacityByNhood).length === 0) {
    return null;
  }

  const sortedCapacityByNhood = Object.entries(capacityByNhood).sort(
    ([, a], [, b]) => b - a
  );

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
      <p className="text-lg font-semibold">Capacity by neighborhood</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
