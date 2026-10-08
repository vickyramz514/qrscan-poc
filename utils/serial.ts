let tail: Promise<unknown> = Promise.resolve();

/** Runs async tasks one at a time so saves and syncs cannot overwrite each other. */
export function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
