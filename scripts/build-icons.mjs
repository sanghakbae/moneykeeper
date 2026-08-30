#!/usr/bin/env node
// assets/icon.svg 하나에서 홈 화면 아이콘과 파비콘을 전부 만든다.
// 색이나 모양을 바꾸려면 SVG 만 고치고 `npm run icons` 를 다시 돌리면 된다.

import { mkdirSync, copyFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'assets', 'icon.svg')
const outDir = join(root, 'public', 'icons')

// maskable 아이콘은 안전 영역(가운데 80%) 밖이 잘릴 수 있어 여백을 두고 그린다.
const TARGETS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1 },
  { file: 'apple-touch-icon.png', size: 180, background: '#1f66bd' },
  { file: 'favicon-32.png', size: 32 },
  { file: 'favicon-16.png', size: 16 },
]

mkdirSync(outDir, { recursive: true })
const svg = readFileSync(source)

for (const { file, size, padding = 0, background } of TARGETS) {
  const inner = Math.round(size * (1 - padding * 2))
  const pad = Math.round((size - inner) / 2)

  let image = sharp(svg, { density: 384 }).resize(inner, inner)

  if (pad > 0 || background) {
    image = image.extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: background || '#1f66bd',
    })
  }

  await image.png({ compressionLevel: 9 }).toFile(join(outDir, file))
  console.log(`✔ ${file} (${size}×${size}${padding ? ', maskable 여백 포함' : ''})`)
}

// 파비콘용 SVG 는 원본을 그대로 쓴다 — 벡터라 어느 크기에서도 선명하다.
copyFileSync(source, join(outDir, 'icon.svg'))
console.log('✔ icon.svg (원본 복사)')
