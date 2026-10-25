import type { Task } from '../types'

export type Change = { add?: { title: string; steps?: string[] }[]; remove?: string[] }

export function apply(tasks: Task[], change: Change): Task[] {
  const removed = new Set(change.remove ?? [])
  let last = Math.max(0, ...tasks.map(t => Number(t.id.slice(1)) || 0))
  const added = (change.add ?? []).map(({ title, steps = [] }) => ({
    id: `t${++last}`,
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
