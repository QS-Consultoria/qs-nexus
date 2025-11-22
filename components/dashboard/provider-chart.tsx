'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProviderChartProps {
  data: Array<{ provider: string; count: number }>
}

export function ProviderChart({ data }: ProviderChartProps) {
  const chartData = data.map(item => ({
    name: item.provider === 'openai' ? 'OpenAI' : item.provider === 'google' ? 'Google' : item.provider,
    quantidade: item.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="quantidade" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}

