// Stopping `tspci --dev` / `tspci --watch` with Ctrl+C (SIGINT) or SIGTERM.
//
// A listener on SIGINT replaces Node's default of exiting, so closing the watchers there is not enough: the live server
// and livereload keep the process alive and Ctrl+C seems to do nothing. onShutdown collects what has to be closed;
// the first signal closes it all and then exits, a second signal exits at once.

const closers = [];
let stopping = false;
let installed = false;

/** Registers something to close (a watcher) when the process is stopped. */
export function onShutdown(close) {
  closers.push(close);
  if (installed) return;
  installed = true;
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown());
}

/** Closes what was registered, then exits; `exit` and `timeoutMs` are there for the tests. */
export async function shutdown({ exit = (code) => process.exit(code), timeoutMs = 1500 } = {}) {
  if (stopping) return exit(0); // a second Ctrl+C: stop now
  stopping = true;
  const closing = Promise.allSettled(closers.map((close) => Promise.resolve().then(close)));
  await Promise.race([closing, new Promise((resolve) => setTimeout(resolve, timeoutMs).unref())]);
  exit(0);
}
