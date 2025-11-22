'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface TokensChartProps {
  totalTokens: {
    input: number
    output: number
    total: number
  }
  tokensByProvider: Array<{
    provider: string
    input: number
    output: number
    total: number
  }>
  tokensByModel: Array<{
    model: string
    provider: string
    input: number
    output: number
    total: number
  }>
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00']

export function TokensChart({ totalTokens, tokensByProvider, tokensByModel }: TokensChartProps) {
  // Gráfico de tokens por provider
  const providerData = tokensByProvider.map(item => ({
    name: item.provider === 'openai' ? 'OpenAI' : item.provider === 'google' ? 'Google' : item.provider,
    input: item.input,
    output: item.output,
    total: item.total,
  }))

  // Gráfico de tokens por modelo (top 10)
  const topModels = tokensByModel.slice(0, 10)
  const modelData = topModels.map(item => ({
    name: item.model?.length > 15 ? `${item.model.substring(0, 15)}...` : item.model,
    input: item.input,
    output: item.output,
    total: item.total,
    provider: item.provider === 'openai' ? 'OpenAI' : item.provider === 'google' ? 'Google' : item.provider,
  }))

  // Dados para gráfico de pizza (input vs output)
  const inputOutputData = [
    { name: 'Input', value: totalTokens.input },
    { name: 'Output', value: totalTokens.output },
  ]

  return (
    <div className="space-y-6">
      {/* Total de tokens - Input vs Output */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Distribuição de Tokens (Input vs Output)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={inputOutputData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, value }) => 
                `${name}: ${value.toLocaleString()} (${((percent ?? 0) * 100).toFixed(1)}%)`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {inputOutputData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Tokens por provider */}
      {providerData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Tokens por Provider</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={providerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="input" stackId="a" fill="#8884d8" name="Input" />
              <Bar dataKey="output" stackId="a" fill="#82ca9d" name="Output" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tokens por modelo */}
      {modelData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Tokens por Modelo (Top 10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="input" stackId="a" fill="#8884d8" name="Input" />
              <Bar dataKey="output" stackId="a" fill="#82ca9d" name="Output" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

