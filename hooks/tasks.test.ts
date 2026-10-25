import { expect, test } from 'claude-code/testing'

import { apply, describe, randomId } from './tasks'

test('adds with the given ids, removes by id, and describes status', async () => {
  let n = 0
  const id = () => `t${++n}`
  const one = apply([], { add: [{ title: 'Playtest lobby', steps: ['Press Play'] }, { title: 'Log in' }] }, id)
  expect(one.map(t => t.id)).toEqual(['t1', 't2'])

  const two = apply(one, { remove: ['t1'], add: [{ title: 'Check zoo' }] }, id)
  expect(two.map(t => t.id)).toEqual(['t2', 't3'])
  expect(describe([{ ...two[0]!, isDone: true }])).toBe('t2 [user marked done] Log in')
  expect(describe([])).toBe('No tasks for the user.')
})

test('random ids are short and differ', async () => {
  const ids = new Set(Array.from({ length: 50 }, randomId))
  expect(ids.size).toBeGreaterThan(45)
  expect([...ids].every(id => /^t[0-9a-z]{1,4}$/.test(id))).toBe(true)
})
