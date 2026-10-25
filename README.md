# your-turn

A Claude Code mod for the steps only you can do. When Claude needs you to do something by hand (a manual test, a UI check, a login, a browser or hardware step), it adds a task with short numbered steps to a "Your turn" band above the prompt. Mark a task `done` in the band; every prompt you send carries the task list, so Claude sees what you finished and removes it.

Claude manages the list through the `mcp__your-turn__your_turn` tool (`add` tasks with a title and 1-5 steps, `remove` them by id). Tasks last for the session.

## Install

At the prompt of a terminal session:

```
/plugin install your-turn --marketplace ExoticPengy/your-turn
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install your-turn --marketplace ExoticPengy/your-turn
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `ExoticPengy/your-turn`, then Add plugin.

This repository is private: installing needs read access to it on GitHub and a git credential for github.com on your machine (an SSH key, or `gh auth login` then `gh auth setup-git`).

## Use

The band appears by itself when Claude adds a task. On the normal terminal screen, press ctrl+x then tab to reach the band and Enter on `done`; in fullscreen mode, click it.
