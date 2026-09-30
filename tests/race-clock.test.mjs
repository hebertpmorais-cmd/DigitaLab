import test from 'node:test'
import assert from 'node:assert/strict'
import { raceClock } from '../lib/race-clock.mjs'
test('does not start before the first character', () => {
  assert.deepEqual(raceClock(null, 90000, 30), {elapsed:0, remaining:30, expired:false})
})
test('accounts for delayed timer callbacks', () => {
  assert.deepEqual(raceClock(1000, 13750, 30), {elapsed:12.75, remaining:18, expired:false})
})
test('expires exactly at the deadline and clamps late callbacks', () => {
  for (const now of [31000, 90000]) {
    assert.deepEqual(raceClock(1000, now, 30), {elapsed:30, remaining:0, expired:true})
  }
})
test('retains fractions for a race completed before the timer ends', () => {
  assert.equal(raceClock(1000, 2850, 15).elapsed, 1.85)
})

test('unlimited training counts elapsed time without expiring', () => {
  assert.deepEqual(raceClock(null, 90000, null), {elapsed:0, remaining:null, expired:false})
  assert.deepEqual(raceClock(1000, 3601500, null), {elapsed:3600.5, remaining:null, expired:false})
})
