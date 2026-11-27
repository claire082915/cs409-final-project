// A loan is overdue once its whole due date has passed
export function isOverdue(loan) {
  return (
    loan.status === 'approved' &&
    new Date(`${String(loan.dueDate).slice(0, 10)}T23:59:59`) < new Date()
  )
}

export function getStatus(loan) {
  if (loan.status === 'requested') return { id: 'pending', label: 'Pending' }
  if (loan.status === 'rejected') return { id: 'declined', label: 'Declined' }
  if (loan.status === 'cancelled') return { id: 'cancelled', label: 'Cancelled' }
  if (isOverdue(loan)) return { id: 'overdue', label: 'Overdue' }
  if (loan.status === 'approved') return { id: 'active', label: 'Active' }
  if (loan.status === 'returned') return { id: 'returned', label: 'Awaiting confirmation' }
  return { id: 'completed', label: 'Completed' }
}

export function isFinished(loan) {
  return loan.status === 'confirmed'
}
