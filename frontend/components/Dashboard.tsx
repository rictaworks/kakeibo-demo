import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import type { DashboardData } from '../lib/api'
import SuggestionCard from './SuggestionCard'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280',
]

type Props = {
  data: DashboardData
  year: number
  month: number
}

export default function Dashboard({ data, year, month }: Props) {
  const { monthly_totals, category_totals, daily_series, suggestions } = data

  const monthTotal = monthly_totals.reduce((sum, m) => sum + m.total, 0)

  const activeCats = category_totals.filter(c => c.total > 0)
  const doughnutData = {
    labels: activeCats.map(c => c.category_name),
    datasets: [{
      data: activeCats.map(c => c.total),
      backgroundColor: CHART_COLORS.slice(0, activeCats.length),
      borderWidth: 1,
    }],
  }

  const lineData = {
    labels: daily_series.map(d => d.date.slice(5)),
    datasets: [{
      label: '日別支出',
      data: daily_series.map(d => d.total),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }],
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500">{year}年{month}月の支出合計</p>
        <p className="text-4xl font-bold text-blue-600 mt-1">
          ¥{monthTotal.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">カテゴリ別割合</h2>
          {activeCats.length > 0 ? (
            <Doughnut
              data={doughnutData}
              options={{ plugins: { legend: { position: 'bottom' } } }}
            />
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">データがありません</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">日別推移</h2>
          {daily_series.length > 0 ? (
            <Line
              data={lineData}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { callback: (v) => `¥${Number(v).toLocaleString()}` } },
                },
              }}
            />
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">データがありません</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-4">節約提案</h2>
        <SuggestionCard suggestions={suggestions} />
      </div>
    </div>
  )
}
