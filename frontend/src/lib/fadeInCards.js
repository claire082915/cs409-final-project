// Only new cards fade in, removed and moved cards change at once since sliding across rows looks busy
export function fadeInCards(el, action) {
  if (action === 'add') {
    return new KeyframeEffect(el, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 150,
      easing: 'ease-out',
    })
  }
  return new KeyframeEffect(el, [], { duration: 0 })
}
