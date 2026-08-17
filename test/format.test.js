import test from 'node:test'
import assert from 'node:assert/strict'
import { compactWon, josa } from '../src/lib/format.js'

test('josa 는 받침에 따라 조사를 고른다', () => {
  assert.equal(josa('메모', '을', '를'), '를')
  assert.equal(josa('금액', '을', '를'), '을')
  assert.equal(josa('카테고리', '을', '를'), '를')
  assert.equal(josa('', '을', '를'), '를')
})

test('compactWon 은 큰 금액을 줄여 쓴다', () => {
  assert.equal(compactWon(0), '0')
  assert.equal(compactWon(870), '870')
  assert.equal(compactWon(12000), '1.2만')
  assert.equal(compactWon(3239300), '323.9만')
  assert.equal(compactWon(150000000), '1.5억')
})
