import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  free: number;
  trial: number;
  premium: number;
}

const COLORS = { free: "#52525b", trial: "#f59e0b", premium: "#10b981" };

export function ConversionChart({ free, trial, premium }: Props) {
  const total = free + trial + premium;
  const data = [
    { name: "Free", value: free, color: COLORS.free },
    { name: "Trial", value: trial, color: COLORS.trial },
    { name: "Premium", value: premium, color: COLORS.premium },
  ];
  const conv = total > 0 ? ((premium / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-zinc-100">Taxa de conversão</div>
        <div className="text-[11px] text-zinc-500">Free vs Trial vs Premium</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#a1a1aa" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Conv.</div>
            <div className="text-lg font-semibold tabular-nums text-emerald-400">{conv}%</div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((d) => {
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-zinc-300">{d.name}</span>
                </div>
                <div className="tabular-nums text-zinc-400">
                  <span className="text-zinc-100 font-medium">{d.value}</span>
                  <span className="ml-1.5 text-zinc-500">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
