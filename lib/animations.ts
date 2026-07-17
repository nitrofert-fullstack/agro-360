import type { Variants } from 'framer-motion'

export const EASE_LUXURY = [0.25, 0.46, 0.45, 0.94] as const
export const EASE_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_LUXURY } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.25, ease: EASE_LUXURY } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE_LUXURY } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 28 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE_LUXURY } },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE_LUXURY } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
}

export const celebrationVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -5 },
  visible: {
    opacity: 1, scale: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 18, delay: 0.15 },
  },
}
