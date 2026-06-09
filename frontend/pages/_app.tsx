import type { AppProps } from 'next/app'
import Script from 'next/script'
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
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-C04W1XKS16" strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-C04W1XKS16');
      `}</Script>
      <Component {...pageProps} />
    </>
  )
}
