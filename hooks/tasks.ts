import type { Task } from '../types'

export type Change = { add?: { title: string; steps?: string[] }[]; remove?: string[] }

// Random, so two sessions adding to one project never mint the same id.
export const randomId = () => `t${crypto.getRandomValues(new Uint16Array(1))[0]!.toString(36)}`

export function apply(tasks: Task[], change: Change, newId = randomId): Task[] {
  const removed = new Set(change.remove ?? [])
  const added = (change.add ?? []).map(({ title, steps = [] }) => ({
    id: newId(),
    title,
    steps,
    isDone: false,
  }))

  return [...tasks.filter(t => !removed.has(t.id)), ...added]
}

export function describe(tasks: Task[]): string {
  if (tasks.length === 0) return 'No tasks for the user.'

  return tasks
    .map(t => `${t.id} [${t.isDone ? 'user marked done' : 'waiting on user'}] ${t.title}`)
    .join('\n')
}
