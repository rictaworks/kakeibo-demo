const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export type Category = { id: number; name: string; icon: string }

export type Expense = {
  id: number
  session_id: string
  category_id: number
  category_name: string
  category_icon: string
  date: string
  amount: number
  store_name: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export type OcrItem = { name: string; amount: number }

export type OcrResult = {
  text: string
  amount: number | null
  date: string | null
  store_name: string | null
  items: OcrItem[]
}

export type Classification = {
  category_id: number
  category_name: string
  confidence: 'high' | 'medium' | 'low' | null
}

export type UploadResponse = {
  ocr_result: OcrResult
  classification: Classification
  needs_manual: boolean
}

export type MonthlyTotal = { year: number; month: number; total: number }

export type CategoryTotal = {
  category_id: number
  category_name: string
  category_icon: string
  total: number
  count: number
}

export type DailySeries = { date: string; total: number }

export type Suggestion = {
  rule: string
  message: string
  amount?: number
  ratio?: number
  count?: number
  category_name?: string
}

export type DashboardData = {
  monthly_totals: MonthlyTotal[]
  category_totals: CategoryTotal[]
  daily_series: DailySeries[]
  suggestions: Suggestion[]
}

export type ExpenseInput = {
  date: string
  amount: number
  category_id: number
  store_name?: string
  memo?: string
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function uploadReceipt(formData: FormData): Promise<UploadResponse> {
  const url = `${API_BASE_URL}/api/receipts/upload`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? `Upload error: ${res.status}`)
  }
  return res.json() as Promise<UploadResponse>
}

export async function saveExpense(input: ExpenseInput): Promise<{ id: number; created_at: string }> {
  return apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getExpenses(): Promise<Expense[]> {
  return apiFetch('/api/expenses')
}

export async function updateExpense(id: number, input: Partial<ExpenseInput>): Promise<boolean> {
  const res = await apiFetch<{ id: number; updated: boolean }>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return res.updated
}

export async function deleteExpense(id: number): Promise<boolean> {
  const res = await apiFetch<{ id: number; deleted: boolean }>(`/api/expenses/${id}`, {
    method: 'DELETE',
  })
  return res.deleted
}

export async function getDashboard(year: number, month: number): Promise<DashboardData> {
  return apiFetch(`/api/dashboard?year=${year}&month=${month}`)
}
