import {
  Focusable,
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components'
import '../styles/components/tooltip.css'

// Half a second on hover so passing the mouse over doesn't flash it, picked by hand
const HOVER_DELAY_MS = 500

// A wrapped box keeps its full max width, so narrow it to the widest line before it's placed
function fitToText(tooltip) {
  const text = tooltip?.querySelector('.tooltip-text')
  if (!text) {
    return
  }
  let widestLine = 0
  for (const line of text.getClientRects()) {
    widestLine = Math.max(widestLine, line.width)
  }
  const style = getComputedStyle(tooltip)
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  // Rounded up so the text doesn't wrap again at the new width
  tooltip.style.width = `${Math.ceil(widestLine + padding)}px`
}

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
        ref={width ? undefined : fitToText}
        className={`tooltip ${className}`}
        placement={placement}
        offset={8}
        triggerRef={anchorRef}
        // Measured widths can only be set inline, the stylesheet's 320px cap applies otherwise
        style={width ? { width, maxWidth: 'none' } : undefined}
      >
        <OverlayArrow className="tooltip-arrow">
          <svg width={10} height={6} viewBox="0 0 10 6" aria-hidden="true">
            <path d="M0 0 L5 6 L10 0" />
          </svg>
        </OverlayArrow>
        <span className="tooltip-text">{text}</span>
      </AriaTooltip>
    </TooltipTrigger>
  )
}
