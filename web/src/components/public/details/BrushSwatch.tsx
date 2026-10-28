/** A painted brush-stroke shape filled with one palette color. */
export default function BrushSwatch({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 80" className="w-20 h-14 md:w-24 md:h-16" role="img" aria-label={`Color ${color}`}>
      <title>{color}</title>
      <g fill={color}>
        <path d="M14 30c10-9 24-14 40-15 14-1 26-6 40-8 9-1 15 3 13 9-2 5-9 7-16 9 8 1 14 5 11 10-3 6-14 6-23 8 9 2 13 7 8 11-6 5-19 4-30 7-12 3-23 10-34 9-8-1-12-7-6-13 4-4 10-6 16-8-8 0-17-1-19-6-2-5 1-9 0-13z" />
        <path d="M22 62c14-4 30-6 44-9" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M30 18c16-3 34-6 50-10" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M70 66c10-1 20-3 28-6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>
    </svg>
  );
}
