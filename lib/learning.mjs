// Compare the edited range, including replacements and insertions in the middle.
export function measureEdit(previous, next, target) {
  let start = 0
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++
  let oldEnd = previous.length
  let newEnd = next.length
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd--
    newEnd--
  }
  const added = next.slice(start, newEnd)
  const mistakes = []
  for (let i = 0; i < added.length; i++) {
    const position = start + i
    if (added[i] !== target[position]) mistakes.push({ position, expected: target[position] || '', typed: added[i] })
  }
  return { attempts: added.length, errors: mistakes.length, mistakes }
}

export function exerciseResult(input, target, attempts, errors) {
  const accuracy = attempts > 0 ? Math.max(0, (attempts - errors) / attempts * 100) : 100
  const finished = target.length > 0 && input.length === target.length && attempts > 0
  return { accuracy, finished, passed: finished && accuracy >= 97 }
}

export function isCourseComplete(progress, count) {
  return Array.from({ length: count }, (_, index) => progress[index]?.completed === true).every(Boolean)
}
