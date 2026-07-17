export default function ProgressBar({ pct, gold }) {
  const v = Math.max(0, Math.min(100, pct || 0))
  return (
    <div className={'bar' + (gold ? ' gold' : '')}>
      <span style={{ width: v + '%' }} />
    </div>
  )
}
