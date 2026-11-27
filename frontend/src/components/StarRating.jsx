import { Star } from 'lucide-react'
import { useState } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import '../styles/components/star-rating.css'

const SCORES = [1, 2, 3, 4, 5]

// Stars up to the hovered one light up so the score is clear before clicking
export default function StarRating({ label, score, onChange }) {
  const [hoveredScore, setHoveredScore] = useState(null)
  const shownScore = hoveredScore ?? score

  return (
    <RadioGroup
      className="star-rating"
      orientation="horizontal"
      value={score ? String(score) : null}
      onChange={(value) => onChange(Number(value))}
    >
      <Label className="star-rating-label">{label}</Label>
      <div className="star-rating-stars">
        {SCORES.map((value) => (
          <Radio
            key={value}
            value={String(value)}
            aria-label={`${value} out of 5`}
            className={`star-rating-star${value <= shownScore ? ' filled' : ''}`}
            onHoverStart={() => setHoveredScore(value)}
            onHoverEnd={() => setHoveredScore(null)}
          >
            <Star size={26} aria-hidden="true" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  )
}
