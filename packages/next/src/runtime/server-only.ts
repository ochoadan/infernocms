/**
 * Throws if called in a browser context. Used by `writeCms` to prevent
 * accidental client-side imports of write methods.
 *
 * In Node, server actions, route handlers, and React Server Components,
 * `typeof window` is `'undefined'` and this is a no-op.
 */
export function assertServerOnly(name: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `${name} cannot be used in a browser context. Move this call to a server component, ` +
        `server action, or route handler. (Tokens must never reach the client.)`
    );
  }
}
