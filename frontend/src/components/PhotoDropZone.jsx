import { ImageUp } from 'lucide-react'
import { useState } from 'react'
import { Button, DropZone, FileTrigger } from 'react-aria-components'
import { photoTypeError, SUPPORTED_PHOTO_TYPES } from '../lib/photoTypes.js'
import '../styles/components/photo-drop-zone.css'

// Take the first dropped file, the type check rejects the rest
function droppedFile(items) {
  return items.find((item) => item.kind === 'file')?.getFile()
}

// The same empty look in every drop zone
function EmptyContent() {
  return (
    <>
      <ImageUp size={26} aria-hidden="true" />
      <span className="photo-drop-text">Drop a photo here or</span>
      <span className="photo-drop-choose">Choose photo</span>
    </>
  )
}

// Drop a photo on it or click anywhere to pick one, children replace the empty look like a preview
export default function PhotoDropZone({ className, onPhoto, children }) {
  const [typeError, setTypeError] = useState('')

  const takePhoto = (photo) => {
    if (!photo) {
      return
    }
    const error = photoTypeError(photo)
    setTypeError(error)
    if (!error) {
      onPhoto(photo)
    }
  }

  return (
    <div className="photo-drop-field">
      <DropZone
        className={`photo-drop ${className}`}
        onDrop={async (event) => takePhoto(await droppedFile(event.items))}
      >
        <FileTrigger
          acceptedFileTypes={SUPPORTED_PHOTO_TYPES}
          onSelect={(files) => takePhoto(files?.[0])}
        >
          <Button className="photo-drop-button">{children || <EmptyContent />}</Button>
        </FileTrigger>
      </DropZone>
      {typeError && (
        <p className="photo-drop-error" role="alert">
          {typeError}
        </p>
      )}
    </div>
  )
}
