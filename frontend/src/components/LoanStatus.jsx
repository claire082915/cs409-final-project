import { CircleAlert } from 'lucide-react'
import { getStatus } from '../lib/loanStatus.js'
import '../styles/components/loan-status.css'

export default function LoanStatus({ loan }) {
  const status = getStatus(loan)
  return (
    <span className={`loan-status status-${status.id}`}>
      {status.id === 'overdue' && <CircleAlert size={13} />}
      {status.label}
    </span>
  )
}
