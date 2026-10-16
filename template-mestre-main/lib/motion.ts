export const screenMotion = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
  transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] as const },
}
