/**
 * src/hooks/useIsMobile.js
 * Hook that detects whether the device uses a coarse pointer (touch screen).
 * Used by WordBank to switch between drag-and-drop (desktop) and tap-to-select (mobile).
 * Updates reactively when the pointer type changes (e.g., screen rotation or
 * connecting a mouse to a tablet).
 * @returns {boolean} true if the primary pointer is coarse (touch).
 */

import { useState, useEffect } from 'react'

const QUERY = '(pointer: coarse)'

/**
 * Returns true if the device uses a coarse (touch) pointer.
 * Listens for MediaQueryList change events so the value stays current.
 * @returns {boolean}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(QUERY)
    const handler = (e) => setIsMobile(e.matches)

    // addEventlistener is preferred; addEventListener is modern, addListener is legacy
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    } else {
      // Safari < 14 fallback
      mql.addListener(handler)
      return () => mql.removeListener(handler)
    }
  }, [])

  return isMobile
}
