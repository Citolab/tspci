import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const shutdownUrl = new URL("../src/shutdown.js", import.meta.url).href;

/** A process that registers closers the way cli.js does, keeps itself alive like a server, and reports. */
function child(script) {
  const code = `import { onShutdown } from ${JSON.stringify(shutdownUrl)};\n${script}\nsetInterval(() => {}, 1000);\nconsole.log("ready");`;
  const p = spawn(process.execPath, ["--input-type=module", "-e", code], { stdio: ["ignore", "pipe", "inherit"] });
  let out = "";
  p.stdout.on("data", (d) => (out += d));
  const ready = new Promise((resolve) => p.stdout.on("data", () => out.includes("ready") && resolve()));
  const exited = new Promise((resolve) => p.on("exit", (code, signal) => resolve({ code, signal, out })));
  return { p, ready, exited };
}

test("Ctrl+C (SIGINT) closes the watchers and stops a process that a server keeps alive", async () => {
  const { p, ready, exited } = child(`onShutdown(() => console.log("closed a")); onShutdown(async () => console.log("closed b"));`);
  await ready;
  p.kill("SIGINT");
  const { code, out } = await exited;
  assert.equal(code, 0);
  assert.match(out, /closed a/);
  assert.match(out, /closed b/);
});

test("SIGTERM stops it too, also when a watcher does not close", async () => {
  const { p, ready, exited } = child(`onShutdown(() => new Promise(() => {}));`);
  await ready;
  const start = Date.now();
  p.kill("SIGTERM");
  const { code } = await exited;
  assert.equal(code, 0);
  assert.ok(Date.now() - start < 5000);
});

test("a second Ctrl+C stops at once", async () => {
  const { p, ready, exited } = child(`onShutdown(() => new Promise(() => {}));`);
  await ready;
  p.kill("SIGINT");
  await new Promise((r) => setTimeout(r, 100));
  const start = Date.now();
  p.kill("SIGINT");
  const { code } = await exited;
  assert.equal(code, 0);
  assert.ok(Date.now() - start < 1000);
});
