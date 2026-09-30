import test from 'node:test'
import assert from 'node:assert/strict'
import { persistRace } from '../lib/race-save.mjs'
const session = { id: 'race-id', user_id: 'owner-id' }
const mistakes = [{position: 0, expected: 'a', typed: 'b'}]
function mock(insertResult, existingResult, errorsResult = {}) {
  const writes = []
  return { writes, from(table) {
    return {
      insert(row) { writes.push({table, row}); return table === 'typing_errors' ? Promise.resolve(errorsResult) : this },
      select() { return this }, eq() { return this },
      single() { return Promise.resolve(writes.length ? (writes.filter(x => x.table === 'typing_sessions').length && insertResult) : existingResult) }
    }
  } }
}
test('does not confirm a rejected insert', async () => {
  await assert.rejects(persistRace(mock({error: {code:'42501'}}), session, []))
})
test('requires the returned session ID', async () => {
  await assert.rejects(persistRace(mock({data:null}), session, []))
})
test('saves result and mistake details', async () => {
  const client = mock({data:{id:session.id}})
  assert.equal(await persistRace(client, session, mistakes), 'saved')
  assert.equal(client.writes[1].row[0].session_id, session.id)
})
test('reports partial success if mistake details fail', async () => {
  assert.equal(await persistRace(mock({data:{id:session.id}}, null, {error:{message:'offline'}}), session, mistakes), 'partial')
})
test('lost response can be retried with the same ID without another session', async () => {
  const stored = new Map()
  let loseResponse = true
  const client = { from() {
    let row, id, owner
    return {
      insert(value) { row=value; return this }, select() { return this },
      eq(k,v) { if(k==='id') id=v; else owner=v; return this },
      async single() {
        if (row) {
          if(stored.has(row.id)) return {error:{code:'23505'}}
          stored.set(row.id,row)
          if(loseResponse) { loseResponse=false; throw new Error('connection lost') }
        }
        const found=stored.get(id)
        return {data:found?.user_id===owner ? found : null}
      }
    }
  } }
  await assert.rejects(persistRace(client,session,[]))
  assert.equal(await persistRace(client,session,[]),'saved')
  assert.equal(stored.size,1)
})
