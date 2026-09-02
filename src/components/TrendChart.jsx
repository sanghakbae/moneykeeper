import { compactWon, formatWon } from '../lib/format.js'

const W = 340
const H = 196
const PAD = { top: 22, right: 8, bottom: 24, left: 36 }
// 10px 글자 기준 글자 하나의 대략적인 폭(뷰박스 단위)과 라벨 사이 최소 여백.
const CHAR_W = 5.6
const LABEL_PAD = 4

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
  if (value <= 0) return 10000
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * magnitude
}

/**
 * 겹치지 않는 x축 라벨만 고른다. 선택한 막대는 무조건 살린다.
 * 필요한 간격은 라벨 글자 수로 계산한다 — '1'~'12' 는 12개가 다 들어가고,
 * '8/17' 이나 '24년 4Q' 처럼 긴 라벨은 자동으로 솎인다.
 */
function pickLabels(labels, selectedIndex, xOf) {
  const halfWidth = (i) => (String(labels[i] ?? '').length * CHAR_W) / 2
  const fits = (a, b) =>
    Math.abs(xOf(a) - xOf(b)) >= halfWidth(a) + halfWidth(b) + LABEL_PAD

  const candidates = [
    selectedIndex,
    labels.length - 1,
    0,
    ...labels.map((_, i) => i),
  ]
  const kept = []
  for (const i of candidates) {
    if (i < 0 || i >= labels.length) continue
    if (kept.includes(i)) continue
    if (kept.some((k) => !fits(k, i))) continue
    kept.push(i)
  }
  return new Set(kept)
}

/**
 * 단일 계열 막대 차트. 계열이 하나뿐이라 범례는 두지 않고,
 * 값은 상단 판독부(선택한 구간)와 표 보기가 대신한다.
 */
export default function TrendChart({ data, unitLabel, selectedKey, onSelect }) {
  if (!data.length) return null

  const found = data.findIndex((d) => d.key === selectedKey)
  const index = found >= 0 ? found : data.length - 1
  const active = data[index]
  const grandTotal = data.reduce((sum, d) => sum + d.total, 0)

  if (grandTotal === 0) {
    return (
      <p className="empty-state">
        아직 이 기간에 기록된 지출이 없습니다.
        <br />
        <span className="hint">지출을 입력하면 여기에 추이가 그려집니다.</span>
      </p>
    )
  }

  const max = niceMax(Math.max(...data.map((d) => d.total)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const band = plotW / data.length
  const barW = Math.min(22, Math.max(5, band - 6))
  const y = (v) => PAD.top + plotH - (v / max) * plotH
  const centerOf = (i) => PAD.left + band * i + band / 2
  // 축의 첫 라벨에는 연도를 붙인다 — 그래야 '4Q, 2Q' 가 어느 해인지 알 수 있다.
  // (월별은 1~12 숫자만 쓰므로 labelWithYear 도 같은 값이다.)
  const labelTexts = data.map((d, i) => (i === 0 ? d.labelWithYear || d.label : d.label))
  const labelled = pickLabels(labelTexts, index, centerOf)
  const firstLabelled = Math.min(...labelled)

  const activeX = centerOf(index)
  const activeY = y(active.total)

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
            <text x={PAD.left - 6} y={y(max * f) + 3.5} textAnchor="end">
              {f === 0 ? '0' : compactWon(max * f)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const isOn = i === index
          const h = PAD.top + plotH - y(d.total)
          return (
            <g key={d.key} onClick={() => onSelect(d.key)} style={{ cursor: 'pointer' }}>
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH + PAD.bottom}
                fill="transparent"
              />
              <path
                className={isOn ? 'bar' : 'bar dim'}
                d={barPath(centerOf(i) - barW / 2, y(d.total), barW, h)}
              />
              {labelled.has(i) && (
                <text
                  className={isOn ? 'tick-x on' : 'tick-x'}
                  x={centerOf(i)}
                  y={H - 8}
                  textAnchor="middle"
                >
                  {i === firstLabelled ? d.labelWithYear || d.label : d.label}
                </text>
              )}
            </g>
          )
        })}

        {active.total > 0 && (
          <text className="bar-value" x={activeX} y={activeY - 7} textAnchor="middle">
            {compactWon(active.total)}
          </text>
        )}

        <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>
    </div>
  )
}
