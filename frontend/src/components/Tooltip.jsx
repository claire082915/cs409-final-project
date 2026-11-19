import {
  Focusable,
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components'
import '../styles/components/tooltip.css'

// Half a second on hover so passing the mouse over doesn't flash it, picked by hand
const HOVER_DELAY_MS = 500

// Opens on hover and keyboard focus, empty text disables it
export default function Tooltip({
  text,
  placement = 'bottom',
  className = '',
  anchorRef,
  width,
  children,
}) {
  return (
    <TooltipTrigger delay={HOVER_DELAY_MS} isDisabled={!text}>
      <Focusable>{children}</Focusable>
      <AriaTooltip
        className={`tooltip ${className}`}
        placement={placement}
        offset={8}
        triggerRef={anchorRef}
        // Measured widths can only be set inline, the stylesheet's 240px cap applies otherwise
        style={width ? { width, maxWidth: 'none' } : undefined}
      >
        <OverlayArrow className="tooltip-arrow">
          <svg width={10} height={6} viewBox="0 0 10 6" aria-hidden="true">
            <path d="M0 0 L5 6 L10 0" />
          </svg>
        </OverlayArrow>
        {text}
      </AriaTooltip>
    </TooltipTrigger>
  )
}
