import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "./ChartTheme";

export default function MLPredictionChart({ data }) {
  if (!data?.length) {
    return <p className="chart-empty">No ML predictions yet. Complete a quiz first.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis
          dataKey="name"
          tick={{ fill: chartTheme.axis, fontSize: 11 }}
          angle={-25}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: chartTheme.axis, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: chartTheme.tooltip.bg,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: 8,
          }}
          formatter={(value, name) => {
            if (name === "probability") return [`${value}%`, "Weak probability"];
            return [value, name];
          }}
        />
        <Bar dataKey="probability" name="probability" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.predicted_weak ? "#f87171" : "#34d399"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
