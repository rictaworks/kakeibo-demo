import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import type { ExpenseInput } from '../lib/api'

const CATEGORIES = [
  { id: 1, name: '食料品' },
  { id: 2, name: '外食' },
  { id: 3, name: '交通' },
  { id: 4, name: '医療・健康' },
  { id: 5, name: '衣類・美容' },
  { id: 6, name: '日用品' },
  { id: 7, name: '娯楽' },
  { id: 8, name: 'その他' },
]

type Props = {
  onSubmit: (input: ExpenseInput) => void
  initialValues?: Partial<ExpenseInput>
  loading?: boolean
}

type FormErrors = Partial<Record<keyof ExpenseInput, string>>

export default function ManualForm({ onSubmit, initialValues, loading }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(initialValues?.date ?? today)
  const [amount, setAmount] = useState(initialValues?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(initialValues?.category_id?.toString() ?? '8')
  const [storeName, setStoreName] = useState(initialValues?.store_name ?? '')
  const [memo, setMemo] = useState(initialValues?.memo ?? '')
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): boolean {
    const next: FormErrors = {}
    if (!date) next.date = '日付は必須です'
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      next.amount = '1円以上の金額を入力してください'
    }
    if (!categoryId) next.category_id = 'カテゴリを選択してください'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      date,
      amount: Number(amount),
      category_id: Number(categoryId),
      store_name: storeName || undefined,
      memo: memo || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          日付 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          金額（円） <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min={1}
          placeholder="例: 1200"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">店舗名（任意）</label>
        <input
          type="text"
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          maxLength={100}
          placeholder="例: イオン 渋谷店"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="自由記入"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <FontAwesomeIcon icon={faFloppyDisk} />
        保存する
      </button>
    </form>
  )
}
