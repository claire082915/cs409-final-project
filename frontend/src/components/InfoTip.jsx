import { Info } from 'lucide-react'
import Tooltip from './Tooltip.jsx'
import '../styles/components/info-tip.css'

export default function InfoTip({ text, label }) {
  return (
    <Tooltip text={text}>
      <button type="button" className="info-tip" aria-label={label}>
        <Info size={14} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
