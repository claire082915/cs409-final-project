import { useEffect, useState } from 'react'
import { Button, FileTrigger } from 'react-aria-components'
import Avatar from './Avatar.jsx'
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

  return (
    <div className="photo-picker">
      <Avatar photo={shownPhoto} name={name} username={username} className="photo-picker-preview" />
      {caption}
      <div className="photo-picker-actions">
        <FileTrigger acceptedFileTypes={['image/*']} onSelect={(files) => onSelect(files[0])}>
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
    </div>
  )
}
