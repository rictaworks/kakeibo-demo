import { useState } from 'react'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import type { UploadResponse, ExpenseInput } from '../lib/api'
import { saveExpense } from '../lib/api'
import UploadForm from '../components/UploadForm'
import OcrConfirm from '../components/OcrConfirm'
import ManualForm from '../components/ManualForm'

type State =
  | { phase: 'idle' }
  | { phase: 'confirm'; response: UploadResponse }
  | { phase: 'manual' }
  | { phase: 'saving' }
  | { phase: 'done' }

export default function UploadPage() {
  const router = useRouter()
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [error, setError] = useState<string | null>(null)

  function handleUploadSuccess(response: UploadResponse) {
    setError(null)
    setState({ phase: 'confirm', response })
  }

  function handleUploadError(msg: string) {
    setError(msg)
  }

  async function handleSave(input: ExpenseInput) {
    setState({ phase: 'saving' })
    setError(null)
    try {
      await saveExpense(input)
      setState({ phase: 'done' })
      void router.push('/')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存に失敗しました'
      setError(msg)
      setState({ phase: 'idle' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 hover:text-gray-700 p-1 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="text-base font-semibold text-gray-800">レシートを追加</h1>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {state.phase === 'idle' && (
          <UploadForm
            onUploadSuccess={handleUploadSuccess}
            onError={handleUploadError}
          />
        )}

        {state.phase === 'confirm' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">読み取り結果を確認</h2>
            <OcrConfirm
              uploadResponse={state.response}
              onConfirm={handleSave}
              onManual={() => setState({ phase: 'manual' })}
            />
          </div>
        )}

        {state.phase === 'manual' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">支出を手動入力</h2>
            <ManualForm onSubmit={handleSave} />
          </div>
        )}

        {state.phase === 'saving' && (
          <div className="text-center py-10 text-gray-400">保存中...</div>
        )}

        {state.phase !== 'idle' && state.phase !== 'saving' && (
          <button
            onClick={() => { setState({ phase: 'idle' }); setError(null) }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            最初からやり直す
          </button>
        )}
      </main>
    </div>
  )
}
