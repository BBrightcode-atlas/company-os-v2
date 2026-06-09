# Agent Chat

A Paperclip plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

`pnpm dev` rebuilds the worker, manifest, and UI bundles into `dist/`.
When this package is installed from a local path, Paperclip watches that rebuilt
output and reloads the plugin worker. Local installs run trusted code from this
folder on your machine.

This scaffold snapshots `@paperclipai/plugin-sdk` and `@paperclipai/shared` from a local Paperclip checkout at:

`/Users/bright/Projects/company-os-v2/packages/plugins/sdk`

The packed tarballs live in `.paperclip-sdk/` for local development. Before publishing this plugin, switch those dependencies to published package versions once they are available on npm.



## Install Into Paperclip

```bash
paperclipai plugin install /Users/bright/dev/paperclip-plugins/agent-chat
```

## Build Options

- `pnpm build` uses esbuild presets from `@paperclipai/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
