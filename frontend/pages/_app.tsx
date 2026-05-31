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
  return <Component {...pageProps} />
}
