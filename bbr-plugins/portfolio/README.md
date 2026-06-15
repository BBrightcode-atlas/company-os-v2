# Portfolio

Paperclip company project portfolio view.

## What it does

- Adds a plugin page at `/portfolio`.
- Compares active projects by target date, issue progress, schedule state, project status, and active assignees.
- Computes progress from leaf issues only:
  - included statuses: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`
  - excluded status: `cancelled`
  - progress: `done / included leaf issues · percent`
- Shows only `in_progress` issues in the expanded project row.

## Installation

Build and install as a local Paperclip plugin:

```sh
pnpm install
pnpm build
paperclipai plugin install /absolute/path/to/bbr-plugins/portfolio
```

When the plugin is installed and ready, the host sidebar shows `Portfolio` under `New Task`.
