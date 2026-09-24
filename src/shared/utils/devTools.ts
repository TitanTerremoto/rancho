/* eslint-disable no-console */
// Optional chaining because this module is also loaded by the import script,
// which runs in Node and has no Vite environment to read.
export const isDev = import.meta.env?.DEV === true

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args)
}

export function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args)
}
