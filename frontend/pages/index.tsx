import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faChevronLeft, faChevronRight, faTrash, faPencil } from '@fortawesome/free-solid-svg-icons'
import type { DashboardData, Expense, ExpenseInput } from '../lib/api'
import { getDashboard, getExpenses, deleteExpense, updateExpense } from '../lib/api'
import Dashboard from '../components/Dashboard'
import ManualForm from '../components/ManualForm'

type DeleteModal = { open: true; id: number } | { open: false }
type EditModal = { open: true; expense: Expense } | { open: false }

export default function IndexPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({ open: false })
  const [editModal, setEditModal] = useState<EditModal>({ open: false })
  const [editLoading, setEditLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dash, exps] = await Promise.all([
        getDashboard(year, month),
        getExpenses(),
      ])
      setDashboardData(dash)
      setExpenses(exps)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '読み込みに失敗しました'
      console.error('[ERROR] IndexPage: loadData failed', e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  async function handleDelete() {
    if (!deleteModal.open) return
    try {
      await deleteExpense(deleteModal.id)
      setDeleteModal({ open: false })
      await loadData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '削除に失敗しました'
      setError(msg)
    }
  }

  async function handleEdit(input: ExpenseInput) {
    if (!editModal.open) return
    setEditLoading(true)
    try {
      await updateExpense(editModal.expense.id, input)
      setEditModal({ open: false })
      await loadData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '更新に失敗しました'
      setError(msg)
    } finally {
      setEditLoading(false)
    }
  }

  const recentExpenses = expenses.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">かけいぼ</h1>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          レシートを追加
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h2 className="text-base font-semibold text-gray-700">{year}年{month}月</h2>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400">読み込み中...</div>
        ) : dashboardData ? (
          <Dashboard data={dashboardData} year={year} month={month} />
        ) : null}

        {recentExpenses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">最近の支出（直近10件）</h2>
            <ul className="divide-y divide-gray-100">
              {recentExpenses.map(exp => (
                <li key={exp.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {exp.store_name ?? exp.category_name}
                    </p>
                    <p className="text-xs text-gray-400">{exp.date} · {exp.category_name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-gray-700">
                      ¥{exp.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => setEditModal({ open: true, expense: exp })}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                      title="編集"
                    >
                      <FontAwesomeIcon icon={faPencil} />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, id: exp.id })}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="削除"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* 削除確認モーダル */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">支出を削除しますか？</h3>
            <p className="text-sm text-gray-500 mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false })}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">支出を編集</h3>
            <ManualForm
              onSubmit={handleEdit}
              initialValues={{
                date: editModal.expense.date,
                amount: editModal.expense.amount,
                category_id: editModal.expense.category_id,
                store_name: editModal.expense.store_name ?? undefined,
                memo: editModal.expense.memo ?? undefined,
              }}
              loading={editLoading}
            />
            <button
              onClick={() => setEditModal({ open: false })}
              className="mt-3 w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
