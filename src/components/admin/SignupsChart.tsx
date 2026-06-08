import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { date: string; count: number }[];
}

export function SignupsChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Crescimento de usuários</div>
          <div className="text-[11px] text-zinc-500">Novos cadastros por dia</div>
        </div>
        <div className="text-[11px] text-zinc-500 tabular-nums">
          Total: {data.reduce((a, b) => a + b.count, 0)}
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
              }}
              stroke="#52525b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#a1a1aa" }}
              itemStyle={{ color: "#10b981" }}
              labelFormatter={(v) => new Date(v as string).toLocaleDateString("pt-BR")}
              formatter={(v: any) => [v, "Cadastros"]}
            />
            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#gSign)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
