/** Wrap a server action so it can be used as a form action (must return void). */
export function asFormAction<T extends unknown[]>(
  fn: (...args: [...T, FormData]) => Promise<unknown>
) {
  return async (...args: [...T, FormData]) => {
    await fn(...args);
  };
}
