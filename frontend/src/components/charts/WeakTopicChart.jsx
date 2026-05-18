import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLORS, chartTheme } from "./ChartTheme";

export default function WeakTopicChart({ data }) {
  if (!data?.length) {
    return <p className="chart-empty">No weak topics detected.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: chartTheme.tooltip.bg,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: 8,
          }}
          formatter={(value, name, item) => [
            `${item?.payload?.score ?? value}% avg`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ color: chartTheme.axis, fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
