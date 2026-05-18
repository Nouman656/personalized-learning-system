import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "./ChartTheme";

export default function RecommendationStatsChart({ data }) {
  if (!data?.length || data.every((d) => d.total === 0)) {
    return <p className="chart-empty">No recommendations in the system yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: chartTheme.tooltip.bg,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: 8,
          }}
        />
        <Legend wrapperStyle={{ color: chartTheme.axis, fontSize: 12 }} />
        <Bar dataKey="unread" stackId="a" fill="#fbbf24" name="Unread" radius={[0, 0, 0, 0]} />
        <Bar dataKey="read" stackId="a" fill="#34d399" name="Read" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
