// `now` and `startedAt` use the browser's monotonic performance clock.
export function raceClock(startedAt, now, duration) {
  if (duration === null) {
    const elapsed = startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000)
    return { elapsed, remaining: null, expired: false }
  }
  const elapsed = startedAt === null ? 0 : Math.min(duration, Math.max(0, (now - startedAt) / 1000))
  return { elapsed, remaining: Math.ceil(duration - elapsed), expired: elapsed >= duration }
}
