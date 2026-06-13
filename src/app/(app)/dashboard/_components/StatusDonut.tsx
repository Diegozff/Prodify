"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Label,
  ResponsiveContainer,
} from "recharts";

type Entry = { name: string; value: number; fill: string };

const RADIAN = Math.PI / 180;

function CustomLabel({
  cx,
  cy,
  total,
}: {
  cx: number;
  cy: number;
  total: number;
}) {
  return (
    <text textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy - 8} fontSize={28} fontWeight={700} fill="#111827">
        {total}
      </tspan>
      <tspan x={cx} y={cy + 14} fontSize={11} fill="#9ca3af">
        total
      </tspan>
    </text>
  );
}

export default function StatusDonut({ data }: { data: Entry[] }) {
  const filtered = data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-gray-400">
        Sin órdenes registradas
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {filtered.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
          <Label
            content={(props) => {
              const { cx, cy } = props.viewBox as { cx: number; cy: number };
              return <CustomLabel cx={cx} cy={cy} total={total} />;
            }}
            position="center"
          />
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
