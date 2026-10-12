import type { SVGProps } from 'react'

/* Iconos de trazo (estilo outline, 24x24) para el preview de diseño. */

const paths: Record<string, string[]> = {
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  back: ['M15 5l-7 7 7 7'],
  chevronDown: ['M6 9l6 6 6-6'],
  pin: ['M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z', 'M12 12.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z'],
  bell: ['M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z', 'M10 20a2 2 0 0 0 4 0'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-3.8-3.8'],
  heart: ['M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7l1-8z'],
  shield: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z', 'M9 12l2 2 4-4'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  message: ['M4 5h16v11H9l-5 4V5z'],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z'],
  car: ['M5 16V11l2-5h10l2 5v5', 'M3 16h18', 'M7 16v2', 'M17 16v2', 'M7.5 11h9'],
  walk: ['M13 4a1.5 1.5 0 1 0 0 0', 'M10 22l2-6 3 2v4', 'M10 11l1-3 4 1 2 4', 'M8 14l2-3'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z'],
  plug: ['M9 3v5', 'M15 3v5', 'M7 8h10v3a5 5 0 0 1-10 0V8z', 'M12 16v5'],
  droplet: ['M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'],
  sparkle: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M6 6l2.5 2.5', 'M15.5 15.5L18 18'],
  wrench: ['M14.7 6.3a4 4 0 0 0 5 5L12 19l-3-3 7.7-7.7a4 4 0 0 0 0-2z'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 4v4', 'M16 4v4'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  locate: ['M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0', 'M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  layers: ['M12 3l9 5-9 5-9-5 9-5z', 'M3 13l9 5 9-5'],
  navigation: ['M12 3l7 18-7-4-7 4 7-18z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v6', 'M12 7.5v.01'],
  home: ['M4 11l8-7 8 7', 'M6 10v10h12V10'],
  list: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6'],
}

export type IconName = keyof typeof paths

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number }

export function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** Logo UGO (marca de la app) */
export function UgoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 6h6v16a6 6 0 0 0 12 0V6h6v16a12 12 0 0 1-24 0V6z" fill="#006948" />
    </svg>
  )
}
