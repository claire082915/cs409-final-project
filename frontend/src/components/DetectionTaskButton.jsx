import { LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react'
import { useBeforeUnload } from 'react-router-dom'
import Tooltip from './Tooltip.jsx'
import { openPanel, useDetectionTask } from '../lib/detectionTask.js'
import '../styles/components/count-badge.css'
import '../styles/components/detection-task-button.css'

function taskLabel({ status, drafts }) {
  if (status === 'searching') {
    return 'Auto-populate is finding items in your photo'
  }
  if (status === 'failed') {
    return "Couldn't check your photo"
  }
  if (drafts.length === 0) {
    return 'No items found in your photo'
  }
  return `${drafts.length} ${drafts.length === 1 ? 'item' : 'items'} from your photo to review`
}

function TaskIcon({ status }) {
  if (status === 'searching') {
    return <LoaderCircle size={18} className="task-spinner" aria-hidden="true" />
  }
  if (status === 'failed') {
    return <TriangleAlert size={18} aria-hidden="true" />
  }
  return <Sparkles size={18} aria-hidden="true" />
}

// Sits next to notifications so a photo search can run while the user does other things
export default function DetectionTaskButton() {
  const task = useDetectionTask()
  const hasTask = task.status !== 'idle'

  // A reload would lose the search and the drafts, browsers show their own text here
  useBeforeUnload((event) => {
    if (hasTask) {
      event.preventDefault()
    }
  })

  if (!hasTask) {
    return null
  }
  const label = taskLabel(task)
  return (
    <Tooltip text={label}>
      <button
        type="button"
        className={`icon-button task-button task-${task.status}`}
        aria-label={label}
        onClick={openPanel}
      >
        <TaskIcon status={task.status} />
        {task.drafts.length > 0 && <span className="count-badge">{task.drafts.length}</span>}
      </button>
    </Tooltip>
  )
}
