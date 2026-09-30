export default function ProgressBar({
  value = 0,
  className = '',
}) {
  const progress = Math.min(
    100,
    Math.max(0, Number(value) || 0),
  )

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  )
}