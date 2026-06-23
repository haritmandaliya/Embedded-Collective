interface ChipIconProps {
  size?: number
  className?: string
}

export function ChipIcon({ size = 32, className = '' }: ChipIconProps) {
  const dotSize = size / 16
  const positions = [
    [3, 3], [8, 3], [13, 3],
    [3, 8], [8, 8], [13, 8],
    [3, 13], [8, 13], [13, 13],
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
    >
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="1"
        fill="none"
        stroke="#C0192C"
        strokeWidth="0.8"
      />
      {positions.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={dotSize}
          fill={i % 3 === 1 ? '#00F5FF' : '#C0192C'}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </svg>
  )
}
