import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Task } from '../types'
import { apply, describe } from './tasks'
import type { Change } from './tasks'

const TOOL = 'mcp__your-turn__your_turn'
const tasks = atom({ plugin: 'your-turn', key: 'tasks' } as const, [] as Task[], {
  shape: 'tasks-1',
})

const GUIDE = `Shows the user tasks only they can do in a band above their prompt. Whenever the user must do something themselves (a manual test, checking the UI or a game in Studio, a login, a browser or hardware step, a decision in another app), call this with \`add\` instead of only writing it in your reply: one task per thing, a title under 60 characters and 1-5 steps, each one imperative line with exact commands, paths or values; still mention it briefly in your reply. Each user prompt carries the task list: \`remove\` a task as soon as it is done (the user marked it, or said so) or no longer needed, and never leave stale tasks. Returns the current list.`

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

    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const list = await update($, tasks, list => apply(list, e as unknown as Change))

    return { result: describe(list) }
  })

  on('prompt.submit', async ($, e, next) => {
    const list = await read($, tasks)
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
              <Button
                key={`done:${task.id}`}
                plain
                onPress={() =>
                  update($, tasks, l => l.map(t => (t.id === task.id ? { ...t, isDone: !t.isDone } : t)))
                }
              >
                <Text dimColor>{task.isDone ? 'undo' : 'done'}</Text>
              </Button>
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
