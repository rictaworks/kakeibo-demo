import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb } from '@fortawesome/free-solid-svg-icons'
import type { Suggestion } from '../lib/api'

type Props = {
  suggestions: Suggestion[]
}

export default function SuggestionCard({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <FontAwesomeIcon icon={faLightbulb} />
          <span className="font-medium">今月の支出は良好です</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suggestions.slice(0, 3).map((s, i) => (
        <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faLightbulb} className="text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-yellow-800 text-sm">{s.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
