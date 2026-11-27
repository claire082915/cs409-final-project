import { useState } from 'react'
import { campusToday } from '../lib/campusDate.js'
import DatePickerField from './DatePickerField.jsx'
import ItemDialog from './ItemDialog.jsx'
import PendingLabel from './PendingLabel.jsx'
import { apiFetch } from '../lib/api.js'

export default function BorrowItemDialog({ item, onClose, onSent }) {
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')

  const requestBorrow = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dueDate = String(form.get('dueDate') || '')
    const message = String(form.get('message'))
    setRequesting(true)
    setError('')
    try {
      const loan = await apiFetch('loans', {
        method: 'POST',
        body: { itemId: item._id, dueDate, message },
      })
      // Auto-approve might approve the request at once
      onSent(loan.status === 'approved' ? 'Request approved right away!' : 'Borrow request sent!')
    } catch (err) {
      setError(err.message)
    }
    setRequesting(false)
  }

  return (
    <ItemDialog item={item} onClose={onClose}>
      <form className="borrow-request-form" onSubmit={requestBorrow}>
        <DatePickerField
          // The star is hidden from screen readers since isRequired already announces it
          label={
            <>
              Return by{' '}
              <span className="field-required" aria-hidden="true">
                *
              </span>
            </>
          }
          className="form-field"
          name="dueDate"
          minValue={campusToday().add({ days: 1 })}
          isRequired
        />
        <label className="form-field">
          <span>
            Message <span className="field-hint">(optional)</span>
          </span>
          <textarea name="message" maxLength={300} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="browse-modal-actions">
          <button className="action-button action-button-neutral" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button action-button-teal browse-request-button"
            type="submit"
            disabled={requesting}
          >
            <PendingLabel pending={requesting} pendingText="Sending…">
              Send request
            </PendingLabel>
          </button>
        </div>
      </form>
    </ItemDialog>
  )
}
