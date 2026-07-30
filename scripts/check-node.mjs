#!/usr/bin/env node
/**
 * Vite 8 / Rolldown need Node 20+ (util.styleText).
 * Fail fast with a clear hint when the shell is still on Node 18.
 */
const major = Number(process.versions.node.split('.')[0])
if (Number.isNaN(major) || major < 20) {
  console.error(
    `Node ${process.version} is too old for the frontend toolchain.\n` +
      `Use Node 20+:\n` +
      `  nvm use          # reads .nvmrc\n` +
      `  # or: nvm use 20\n` +
      `Then re-run your npm command.`,
  )
  process.exit(1)
}
