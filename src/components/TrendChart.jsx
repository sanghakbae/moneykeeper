import { useEffect, useState } from 'react'
import { compactWon, formatWon } from '../lib/format.js'

const W = 340
const H = 190
const PAD = { top: 14, right: 6, bottom: 22, left: 34 }

/** 윗변만 둥근 막대 — 바닥(축)에는 붙는다. */
function barPath(x, y, w, h, r = 4) {
  const radius = Math.min(r, w / 2, h)
  if (h <= 0.5) return ''
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ')
}

function niceMax(value) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * magnitude
}

/**
 * 단일 계열 막대 차트. 계열이 하나뿐이라 범례는 두지 않고,
 * 값은 상단 판독부(선택한 구간)와 표 보기가 대신한다.
 */
export default function TrendChart({ data, unitLabel }) {
  const [selected, setSelected] = useState(data.length - 1)

  useEffect(() => {
    setSelected(data.length - 1)
  }, [data.length, unitLabel])

  if (!data.length) return null

  const active = data[Math.min(selected, data.length - 1)] || data[data.length - 1]
  const max = niceMax(Math.max(...data.map((d) => d.total), 0))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const band = plotW / data.length
  const barW = Math.min(24, Math.max(6, band - 6))
  const y = (v) => PAD.top + plotH - (v / max) * plotH
  const tickEvery = Math.ceil(data.length / 7)

  return (
    <div>
      <div className="chart-readout">
        <span className="k">{active.title}</span>
        <span className="v">{formatWon(active.total)}</span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${unitLabel} 지출 추이`}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              className="gridline"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * f)}
              y2={y(max * f)}
            />
            <text x={PAD.left - 5} y={y(max * f) + 3.5} textAnchor="end">
              {f === 0 ? '0' : compactWon(max * f)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2
          const h = PAD.top + plotH - y(d.total)
          const isOn = d.key === active.key
          return (
            <g key={d.key} onClick={() => setSelected(i)} style={{ cursor: 'pointer' }}>
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH + PAD.bottom}
                fill="transparent"
              />
              <path
                className={isOn ? 'bar' : 'bar dim'}
                d={barPath(cx - barW / 2, y(d.total), barW, h)}
              />
              {(i % tickEvery === 0 || i === data.length - 1 || isOn) && (
                <text
                  className={isOn ? 'tick-x on' : 'tick-x'}
                  x={cx}
                  y={H - 7}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          )
        })}

        <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>
    </div>
  )
}
