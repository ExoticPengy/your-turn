import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Task } from '../types'

const BAND = { plugin: 'your-turn', component: 'AbovePrompt', props: { hasSurvey: false } } as const
const TOOL = 'mcp__your-turn__your_turn'

// A store shared by "sessions", a repo at /game, and a session started in /game/src.
function engine(on: On, store: Map<string, unknown>) {
  on('tool.register', () => ({ value: { tool: TOOL } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/game/src' }))
  on('fs.exists', (_, e) => ({ value: e.path === '/game/.git' }))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
}

const saved = (store: Map<string, unknown>) => store.get('tasks:/game') as Task[]

test('a task Claude adds shows in the band; done reaches the next prompt', async ($, on) => {
  const store = new Map<string, unknown>()
  engine(on, store)
  await $.session.start({ cwd: '/game/src', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: TOOL, add: [{ title: 'Playtest the lobby', steps: ['Press Play in Studio'] }] })
  const id = saved(store)[0]!.id

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await ui.find({ type: 'Text', text: /Press Play in Studio/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  await ui.press({ key: `done:${id}` })
  await ui.unmount()

  const sent = await $.prompt.submit({ text: 'ok' } as Parameters<typeof $.prompt.submit>[0])
  expect(sent.context?.join('')).toContain(`${id} [user marked done] Playtest the lobby`)
})

test('start restores open tasks, drops done ones, and keeps another session\'s adds', async ($, on) => {
  const store = new Map<string, unknown>([
    ['tasks:/game', [
      { id: 'ta', title: 'Open task', steps: [], isDone: false },
      { id: 'tb', title: 'Done task', steps: [], isDone: true },
    ]],
  ])
  engine(on, store)
  await $.session.start({ cwd: '/game/src', surface: 'terminal', isInteractive: true })
  expect(saved(store).map(t => t.id)).toEqual(['ta'])

  // Another session adds to the same project; this one's next add keeps it.
  store.set('tasks:/game', [...saved(store), { id: 'tc', title: 'Other session', steps: [], isDone: false }])
  await $.tool.call({ tool: TOOL, add: [{ title: 'Log in' }] })
  expect(saved(store).map(t => t.title)).toEqual(['Open task', 'Other session', 'Log in'])
})

test('dismiss removes a task', async ($, on) => {
  const store = new Map<string, unknown>([['tasks:/game', [{ id: 'ta', title: 'Gone', steps: [], isDone: false }]]])
  engine(on, store)
  await $.session.start({ cwd: '/game/src', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  await ui.press({ key: 'dismiss:ta' })
  await ui.unmount()
  expect(saved(store)).toEqual([])
})
