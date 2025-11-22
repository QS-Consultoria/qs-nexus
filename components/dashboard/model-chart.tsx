'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ModelChartProps {
  data: Array<{ model: string; provider: string; count: number }>
}

export function ModelChart({ data }: ModelChartProps) {
  // Limita a 10 modelos mais usados para não sobrecarregar o gráfico
  const topModels = data.slice(0, 10)
  
  const chartData = topModels.map(item => ({
    name: item.model?.length > 20 ? `${item.model.substring(0, 20)}...` : item.model,
    quantidade: item.count,
    provider: item.provider === 'openai' ? 'OpenAI' : item.provider === 'google' ? 'Google' : item.provider,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="quantidade" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}

