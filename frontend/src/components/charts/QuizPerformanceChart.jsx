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

export default function QuizPerformanceChart({ data }) {
  if (!data?.length) {
    return <p className="chart-empty">No quiz attempts for this student yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: chartTheme.tooltip.bg,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: 8,
          }}
          formatter={(value) => [`${value}%`, "Score"]}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.weak ? "#f87171" : "#818cf8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
