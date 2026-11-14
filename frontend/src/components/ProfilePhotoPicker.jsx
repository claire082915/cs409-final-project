import { useEffect, useState } from 'react'
import { Button, FileTrigger } from 'react-aria-components'
import { UserRound } from 'lucide-react'
import '../styles/components/profile-photo-picker.css'

// Shows a picked file from the browser, the caller uploads it when the form is saved
export default function ProfilePhotoPicker({ photo, file, onSelect, onRemove, isDisabled }) {
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
      <span className="photo-picker-preview">
        {shownPhoto ? <img src={shownPhoto} alt="Your profile photo" /> : <UserRound size={26} />}
      </span>
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
