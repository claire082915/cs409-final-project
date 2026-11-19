import { useEffect, useState } from 'react'
import { Button, FileTrigger } from 'react-aria-components'
import Avatar from './Avatar.jsx'
import { photoTypeError, SUPPORTED_PHOTO_TYPES } from '../lib/photoTypes.js'
import '../styles/components/profile-photo-picker.css'

// Shows a picked file from the browser, the caller uploads it when the form is saved
export default function ProfilePhotoPicker({
  photo,
  name,
  username,
  caption,
  file,
  onSelect,
  onRemove,
  isDisabled,
}) {
  const [filePreview, setFilePreview] = useState('')
  const [typeError, setTypeError] = useState('')

  // Free the preview URL when the file changes or the picker unmounts
  useEffect(() => {
    if (!file) {
      setFilePreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shownPhoto = filePreview || photo

  const choosePhoto = (pickedFile) => {
    const error = photoTypeError(pickedFile)
    setTypeError(error)
    if (!error) {
      onSelect(pickedFile)
    }
  }

  return (
    <div className="photo-picker">
      <Avatar photo={shownPhoto} name={name} username={username} className="photo-picker-preview" />
      {caption}
      <div className="photo-picker-actions">
        <FileTrigger
          acceptedFileTypes={SUPPORTED_PHOTO_TYPES}
          onSelect={(files) => choosePhoto(files[0])}
        >
          <Button className="photo-picker-upload" isDisabled={isDisabled}>
            {shownPhoto ? 'Change photo' : 'Upload photo'}
          </Button>
        </FileTrigger>
        {shownPhoto && (
          <Button className="photo-picker-remove" isDisabled={isDisabled} onPress={onRemove}>
            Remove
          </Button>
        )}
      </div>
      {typeError && (
        <p className="photo-picker-error" role="alert">
          {typeError}
        </p>
      )}
    </div>
  )
}
