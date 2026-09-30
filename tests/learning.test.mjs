import test from 'node:test'
import assert from 'node:assert/strict'
import { measureEdit, exerciseResult, isCourseComplete } from '../lib/learning.mjs'

test('counts a same-length replacement and retains its expected key', () => {
  assert.deepEqual(measureEdit('asdf', 'axdf', 'asdf'), {
    attempts: 1, errors: 1, mistakes: [{ position: 1, expected: 's', typed: 'x' }]
  })
})
test('correction adds an attempt without removing the earlier error', () => {
  const wrong = measureEdit('a', 'ax', 'asdf')
  const deletion = measureEdit('ax', 'a', 'asdf')
  const correction = measureEdit('a', 'as', 'asdf')
  assert.equal(wrong.errors + deletion.errors + correction.errors, 1)
  assert.equal(wrong.attempts + deletion.attempts + correction.attempts, 2)
})
test('deletion alone does not count as typing', () => {
  assert.equal(measureEdit('asdf', 'af', 'asdf').attempts, 0)
})
test('counts replacements even when the new value is shorter', () => {
  assert.equal(measureEdit('asdf', 'axf', 'asdf').errors, 1)
})
test('requires actual attempts and the whole exercise', () => {
  assert.equal(exerciseResult('asdf', 'asdf', 0, 0).passed, false)
  assert.equal(exerciseResult('asd', 'asdf', 3, 0).passed, false)
})
test('97 percent threshold uses unrounded accuracy', () => {
  assert.equal(exerciseResult('asdf', 'asdf', 1000, 30).passed, true)
  const result = exerciseResult('asdf', 'asdf', 997, 30)
  assert.equal(result.accuracy.toFixed(1), '97.0')
  assert.equal(result.passed, false)
})
test('last lesson alone cannot complete the course', () => {
  assert.equal(isCourseComplete({3: {completed: true}}, 4), false)
  assert.equal(isCourseComplete(Object.fromEntries([0,1,2,3].map(i => [i, {completed: true}])), 4), true)
})
