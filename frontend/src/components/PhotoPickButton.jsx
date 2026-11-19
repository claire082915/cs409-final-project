import '../styles/components/photo-pick-button.css'

// A button that opens the file picker, the input is cleared so picking the same photo again still counts
export default function PhotoPickButton({ className, onPick, children }) {
  return (
    <label className={className}>
      {children}
      <input
        className="photo-pick-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const photo = event.target.files?.[0]
          event.target.value = ''
          if (photo) onPick(photo)
        }}
      />
    </label>
  )
}
