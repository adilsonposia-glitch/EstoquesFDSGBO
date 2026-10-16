import { Inter, Inter_Tight } from 'next/font/google'

/** Inter — interfaces densas, textos pequenos e UI geral. */
export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

/** Inter Tight — títulos médios com espaçamento mais colado. */
export const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  display: 'swap',
})

/** Inter Display — títulos grandes (via eixo opsz da Inter variable). */
export const interDisplay = Inter({
  variable: '--font-inter-display',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
})

export const fontVariables = [
  inter.variable,
  interTight.variable,
  interDisplay.variable,
].join(' ')
