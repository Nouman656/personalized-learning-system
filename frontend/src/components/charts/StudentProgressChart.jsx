import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "./ChartTheme";

export default function StudentProgressChart({ data }) {
  if (!data?.length) {
    return <p className="chart-empty">No progress data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis dataKey="date" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: chartTheme.tooltip.bg,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: 8,
          }}
          formatter={(value) => [`${value}%`, "Score"]}
        />
        <ReferenceLine y={60} stroke="#f87171" strokeDasharray="4 4" label={{ value: "60%", fill: "#f87171", fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#22d3ee"
          strokeWidth={3}
          dot={{ fill: "#22d3ee", r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
