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

  const sortedCapacityByNhood = Object.entries(capacityByNhood)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // bar chart
  const options: HighchartsReactProps = {
    chart: {
      type: "bar",
      // TODO: make this take up the full height
      height: 600,
    },
    title: {
      text: "Capacity by neighborhood",
      align: "left",
    },
    xAxis: {
      categories: sortedCapacityByNhood.map(([nhood]) => nhood),
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
      },
    ],
  };

  return (
    <div className="border rounded p-4 shadow">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
