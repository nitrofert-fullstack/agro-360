"use client"

import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"

interface NameValueFill {
  name: string
  value: number
  fill: string
}

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 12,
} as const

export function MonthlyTrendChart({
  data,
  mesFormatter,
}: {
  data: Array<{ mes: string; total: number }>
  mesFormatter: (mes: string) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.45 0.18 145)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="oklch(0.45 0.18 145)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={mesFormatter} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v) => mesFormatter(String(v))}
          formatter={(value) => [`${value}`, 'Registros']}
        />
        <Area type="monotone" dataKey="total" stroke="oklch(0.45 0.18 145)" fill="url(#areaGrad)" strokeWidth={2.5} dot={{ r: 3, fill: 'oklch(0.45 0.18 145)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function EstadoDonutChart({ data }: { data: NameValueFill[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} cx="50%" cy="46%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          <text x="50%" y="43%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 700, fill: 'var(--foreground)' }}>
            {data.reduce((a, b) => a + b.value, 0)}
          </text>
          <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}>
            registros
          </text>
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} registros`, '']} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MunicipioBarChart({ data }: { data: Array<{ municipio: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="municipio" tick={{ fontSize: 10 }} width={92} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Registros']} />
        <Bar dataKey="total" radius={[0, 5, 5, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`oklch(${0.45 + i * 0.035} 0.18 145)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GenderDonutChart({ data }: { data: NameValueFill[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="48%" innerRadius={60} outerRadius={88} dataKey="value" strokeWidth={0} paddingAngle={3}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 700, fill: 'var(--foreground)' }}>
            {data.reduce((a, b) => a + b.value, 0)}
          </text>
          <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}>
            productores
          </text>
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Productores']} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function AsesorBarChart({ data }: { data: Array<{ nombre: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={140} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} visitas`, '']} />
        <Bar dataKey="total" radius={[0, 5, 5, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? '#f59e0b' : '#d97706'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DepartamentoBarChart({ data }: { data: Array<{ departamento: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="departamento" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Registros']} />
        <Bar dataKey="total" fill="#a855f7" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
