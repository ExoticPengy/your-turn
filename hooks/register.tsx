import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Task } from '../types'
import { apply, describe } from './tasks'
import type { Change } from './tasks'

const TOOL = 'mcp__your-turn__your_turn'
const tasks = atom({ plugin: 'your-turn', key: 'tasks' } as const, [] as Task[], {
  shape: 'tasks-1',
})

const GUIDE = `Shows the user tasks only they can do in a band above their prompt. Whenever the user must do something themselves (a manual test, checking a UI or a running app by hand, a login, a browser or hardware step, a decision in another app), call this with \`add\` instead of only writing it in your reply: one task per thing, a title under 60 characters and 1-5 steps, each one imperative line with exact commands, paths or values. The band shows the task to the user, so do not repeat the task or its steps in your reply: at most one short line pointing to the band; the user asks if they want more. Each user prompt carries the task list: \`remove\` a task as soon as it is done (the user marked it, or said so) or no longer needed, and never leave stale tasks. Returns the current list.`

let projectKey: string | undefined

// Keyed by the git root (else the folder), so a subfolder shares its project's list.
async function storeKey($: EngineInterface): Promise<string> {
  if (projectKey) return projectKey
  const cwd = await $.session.cwd()
  let dir = cwd
  while (!(await $.fs.exists(`${dir}/.git`)) && dir.lastIndexOf('/') > 0) {
    dir = dir.slice(0, dir.lastIndexOf('/'))
  }
  projectKey = `tasks:${(await $.fs.exists(`${dir}/.git`)) ? dir : cwd}`

  return projectKey
}

async function loadSaved($: EngineInterface): Promise<Task[]> {
  const saved = await $.store.get(await storeKey($))

  return Array.isArray(saved) ? (saved as Task[]) : []
}

// The store is the source of truth: each change applies to what is saved now,
// so another session's writes to the same project survive.
async function change($: EngineInterface, fn: (list: Task[]) => Task[]): Promise<Task[]> {
  const list = fn(await loadSaved($))
  await $.store.set(await storeKey($), list)
  await update($, tasks, () => list)

  return list
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'your_turn',
      description: GUIDE,
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          add: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'What to do, under 60 characters' },
                steps: { type: 'array', items: { type: 'string' }, description: '1-5 short imperative steps' },
              },
              required: ['title'],
            },
          },
          remove: { type: 'array', items: { type: 'string' }, description: 'Task ids to remove' },
        },
      },
    })

    // Done tasks were seen by the last session's Claude; start without them.
    await change($, list => list.filter(t => !t.isDone))

    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const list = await change($, list => apply(list, e as unknown as Change))

    return { result: `${describe(list)}\nShown in the band; do not repeat these steps in your reply.` }
  })

  on('prompt.submit', async ($, e, next) => {
    const list = await loadSaved($)
    await update($, tasks, () => list)
    if (list.length === 0) return next(e)

    return next({ ...e, context: [...(e.context ?? []), `Your-turn tasks (remove finished ones with ${TOOL}):\n${describe(list)}`] })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, tasks)
    if (e.props.hasSurvey || list.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const open = list.filter(t => !t.isDone).length

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
        <Text color="warning" bold>
          Your turn{open ? ` · ${open} to do` : ' · all done'}
        </Text>
        {list.map(task => (
          <Box flexDirection="column" key={task.id}>
            <Box justifyContent="space-between">
              <Text bold={!task.isDone} dimColor={task.isDone} strikethrough={task.isDone}>
                {task.isDone ? '✓' : '○'} {task.title}
              </Text>
              <Box gap={2}>
                <Button
                  key={`done:${task.id}`}
                  plain
                  onPress={() =>
                    change($, l => l.map(t => (t.id === task.id ? { ...t, isDone: !t.isDone } : t)))
                  }
                >
                  <Text dimColor>{task.isDone ? 'undo' : 'done'}</Text>
                </Button>
                <Button key={`dismiss:${task.id}`} plain onPress={() => change($, l => l.filter(t => t.id !== task.id))}>
                  <Text dimColor>✕</Text>
                </Button>
              </Box>
            </Box>
            {!task.isDone &&
              task.steps.map((step, i) => (
                <Text>
                  {'  '}
                  <Text dimColor>{i + 1}.</Text> {step}
                </Text>
              ))}
          </Box>
        ))}
      </Box>
    )
  })
}
