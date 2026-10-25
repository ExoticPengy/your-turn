export type Task = { id: string; title: string; steps: string[]; isDone: boolean }

declare module 'claude-code' {
  interface PluginState {
    'your-turn': { tasks: Shaped<Task[]> }
  }
}
