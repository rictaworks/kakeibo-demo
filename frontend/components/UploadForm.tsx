import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faSpinner } from '@fortawesome/free-solid-svg-icons'
import type { UploadResponse } from '../lib/api'
import { uploadReceipt } from '../lib/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

type Props = {
  onUploadSuccess: (response: UploadResponse) => void
  onError: (msg: string) => void
}

export default function UploadForm({ onUploadSuccess, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'JPEG・PNG・WebP形式のファイルを選択してください'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'ファイルサイズは5MB以下にしてください'
    }
    return null
  }

  async function handleFile(file: File) {
    const err = validateFile(file)
    if (err) {
      onError(err)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('honeypot', '')
      const result = await uploadReceipt(formData)
      onUploadSuccess(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'アップロードに失敗しました'
      onError(msg)
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
        ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}
        ${uploading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      {/* ハニーポット: ボット対策フィールド */}
      <input name="honeypot" type="text" style={{ display: 'none' }} tabIndex={-1} readOnly />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl animate-spin" />
          <p className="text-sm">OCR処理中です...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <FontAwesomeIcon icon={faUpload} className="text-3xl" />
          <div>
            <p className="font-medium text-gray-600">レシートをアップロード</p>
            <p className="text-xs mt-1">クリックまたはドラッグ＆ドロップ</p>
            <p className="text-xs">JPEG / PNG / WebP（最大5MB）</p>
          </div>
        </div>
      )}
    </div>
  )
}
