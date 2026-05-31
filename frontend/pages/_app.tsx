import type { AppProps } from 'next/app'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faBasketShopping, faUtensils, faTrain, faHeartPulse, faShirt,
  faSoap, faGamepad, faCircleDot, faUpload, faSpinner, faLightbulb,
  faFloppyDisk, faArrowLeft, faTrash, faPencil, faPlus,
  faChevronLeft, faChevronRight, faCheck,
} from '@fortawesome/free-solid-svg-icons'
import '../styles/globals.css'

library.add(
  faBasketShopping, faUtensils, faTrain, faHeartPulse, faShirt,
  faSoap, faGamepad, faCircleDot, faUpload, faSpinner, faLightbulb,
  faFloppyDisk, faArrowLeft, faTrash, faPencil, faPlus,
  faChevronLeft, faChevronRight, faCheck,
)

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* アンバーバナー */}
      <div style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #f59e0b',
        color: '#92400e',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '13px',
      }}>
        これはデモ版です。データはサーバー再起動時にリセットされる場合があります。
      </div>

      <Component {...pageProps} />

      {/* 右下固定ボタン */}
      <a
        href="https://rictaworks.jp/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          backgroundColor: '#2563eb',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 1000,
          whiteSpace: 'nowrap',
        }}
      >
        💬 ご相談はこちら
      </a>
    </>
  )
}