import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk, faPencil } from '@fortawesome/free-solid-svg-icons'
import type { UploadResponse, ExpenseInput } from '../lib/api'
import ManualForm from './ManualForm'

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '高（店舗名一致）',
  medium: '中（商品キーワード一致）',
  low: '低（金額帯判定）',
}

type Props = {
  uploadResponse: UploadResponse
  onConfirm: (input: ExpenseInput) => void
  onManual: () => void
  loading?: boolean
}

export default function OcrConfirm({ uploadResponse, onConfirm, onManual, loading }: Props) {
  const { ocr_result, classification, needs_manual } = uploadResponse
  const [showManual, setShowManual] = useState(needs_manual)

  const initialValues: Partial<ExpenseInput> = {
    date: ocr_result.date ?? undefined,
    amount: ocr_result.amount ?? undefined,
    category_id: classification.category_id,
    store_name: ocr_result.store_name ?? undefined,
  }

  if (showManual) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          OCRの信頼度が低いため、内容を確認・修正してください。
        </p>
        <ManualForm onSubmit={onConfirm} initialValues={initialValues} loading={loading} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
        <h3 className="font-semibold text-gray-700">OCR読み取り結果</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">認識カテゴリ</span>
          <span className="font-medium">{classification.category_name}</span>

          <span className="text-gray-500">信頼度</span>
          <span className={`font-medium ${classification.confidence === 'high' ? 'text-green-600' : classification.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {classification.confidence ? CONFIDENCE_LABELS[classification.confidence] : '不明'}
          </span>

          {ocr_result.store_name && (
            <>
              <span className="text-gray-500">店舗名</span>
              <span>{ocr_result.store_name}</span>
            </>
          )}

          {ocr_result.amount && (
            <>
              <span className="text-gray-500">金額</span>
              <span>{ocr_result.amount.toLocaleString()} 円</span>
            </>
          )}

          {ocr_result.date && (
            <>
              <span className="text-gray-500">日付</span>
              <span>{ocr_result.date}</span>
            </>
          )}
        </div>
      </div>

      <ManualForm onSubmit={onConfirm} initialValues={initialValues} loading={loading} />

      <button
        type="button"
        onClick={() => setShowManual(true)}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 py-2 px-4 rounded-md text-sm hover:bg-gray-50 transition-colors"
      >
        <FontAwesomeIcon icon={faPencil} />
        手動で入力し直す
      </button>
    </div>
  )
}
