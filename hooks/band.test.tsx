import { expect, test } from 'claude-code/testing'

test('a task Claude adds shows in the band; done reaches the next prompt', async ($, on) => {
  on('tool.register', () => ({ value: { tool: 'mcp__your-turn__your_turn' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({
    tool: 'mcp__your-turn__your_turn',
    add: [{ title: 'Playtest the lobby', steps: ['Press Play in Studio', 'Walk to the wheel'] }],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'your-turn', surface, component: 'AbovePrompt', props: { hasSurvey: false } } as never)
    expect(await ui.find({ type: 'Text', text: /Walk to the wheel/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'your-turn', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false } } as never)
  await ui.press({ key: 'done:t1' })
  await ui.unmount()

  const sent = await $.prompt.submit({ text: 'ok' } as Parameters<typeof $.prompt.submit>[0])
  expect(sent.context?.join('')).toContain('t1 [user marked done] Playtest the lobby')
})
