import { expect, test } from 'claude-code/testing'

import { apply, describe } from './tasks'

test('adds with fresh ids after removals, and describes status', async () => {
  const one = apply([], { add: [{ title: 'Playtest lobby', steps: ['Press Play'] }, { title: 'Log in' }] })
  expect(one.map(t => t.id)).toEqual(['t1', 't2'])

  const two = apply(one, { remove: ['t1'], add: [{ title: 'Check zoo' }] })
  expect(two.map(t => t.id)).toEqual(['t2', 't3'])
  expect(describe([{ ...two[0]!, isDone: true }])).toBe('t2 [user marked done] Log in')
  expect(describe([])).toBe('No tasks for the user.')
})
