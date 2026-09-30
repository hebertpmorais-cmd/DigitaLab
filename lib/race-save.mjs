// A stable client-generated ID makes retrying an uncertain response safe.
export async function persistRace(client, session, mistakes) {
  const { data, error } = await client.from('typing_sessions').insert(session).select('id').single()
  if (error?.code === '23505') {
    const existing = await client.from('typing_sessions').select('id').eq('id', session.id).eq('user_id', session.user_id).single()
    if (existing.error || existing.data?.id !== session.id) throw existing.error || new Error('Resultado não confirmado')
  } else if (error || data?.id !== session.id) {
    throw error || new Error('Resultado não confirmado')
  }
  if (!mistakes.length) return 'saved'
  try {
    const rows = mistakes.map(item => ({ session_id: session.id, user_id: session.user_id,
      position: item.position, expected_char: item.expected, typed_char: item.typed }))
    const result = await client.from('typing_errors').insert(rows)
    return result.error ? 'partial' : 'saved'
  } catch {
    return 'partial'
  }
}
