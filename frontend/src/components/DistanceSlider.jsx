import { useState } from 'react'
import { Label, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components'
import '../styles/components/form-controls.css'

// Same range the items/nearby route accepts
const MIN_MILES = 5
export const MAX_MILES = 100
const STEP_MILES = 5

// The label follows the drag, onChange only fires on release so each drag sends one request
export default function DistanceSlider({ miles, onChange }) {
  const [draggedMiles, setDraggedMiles] = useState(miles)

  return (
    <Slider
      className="distance-slider"
      minValue={MIN_MILES}
      maxValue={MAX_MILES}
      step={STEP_MILES}
      value={draggedMiles}
      onChange={setDraggedMiles}
      onChangeEnd={onChange}
    >
      <div className="distance-slider-header">
        <Label>Distance</Label>
        <SliderOutput>{({ state }) => `Within ${state.values[0]} mi`}</SliderOutput>
      </div>
      <SliderTrack className="distance-slider-track">
        {({ state }) => (
          <>
            <div
              className="distance-slider-fill"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb className="distance-slider-thumb" />
          </>
        )}
      </SliderTrack>
    </Slider>
  )
}
