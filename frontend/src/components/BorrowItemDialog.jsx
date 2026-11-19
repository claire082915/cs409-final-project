import { useState } from 'react'
import { getLocalTimeZone, today } from '@internationalized/date'
import DatePickerField from './DatePickerField.jsx'
import ItemDialog from './ItemDialog.jsx'
import PendingLabel from './PendingLabel.jsx'
import { apiFetch } from '../lib/api.js'

export default function BorrowItemDialog({ item, isMock, onClose, onSent }) {
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')

  const requestBorrow = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dueDate = String(form.get('dueDate') || '')
    const message = String(form.get('message'))
    // Mock items only pretend to send
    if (isMock) {
      onSent(`Request sent to ${item.owner?.displayName || 'the owner'}!`)
      return
    }
    setRequesting(true)
    setError('')
    try {
      await apiFetch('loans', {
        method: 'POST',
        body: { itemId: item._id, dueDate, message },
      })
      onSent('Borrow request sent!')
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
              <span className="borrow-required" aria-hidden="true">
                *
              </span>
            </>
          }
          className="browse-date-label"
          name="dueDate"
          minValue={today(getLocalTimeZone()).add({ days: 1 })}
          isRequired
        />
        <label className="borrow-message-label" htmlFor="borrow-message">
          Message <span className="borrow-field-hint">(optional)</span>
        </label>
        <textarea id="borrow-message" name="message" rows="4" maxLength={300} />
        {error && (
          <p className="borrow-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="browse-modal-actions">
          <button className="browse-cancel-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="browse-request-button" type="submit" disabled={requesting}>
            <PendingLabel pending={requesting} pendingText="Sending…">
              Send request
            </PendingLabel>
          </button>
        </div>
      </form>
    </ItemDialog>
  )
}
