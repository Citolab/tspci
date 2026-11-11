import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { activeDevPage, copyDevPage, devPageMiddleware } from "../src/dev-page.js";

/** A project folder, optionally with its own src/index.html, and a target template in node_modules. */
function project({ ownPage, targetPage } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tspci-dev-page-"));
  if (ownPage !== undefined) {
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/index.html"), ownPage);
  }
  if (targetPage !== undefined) {
    const dir = path.join(root, "node_modules/@citolab/tspci-qti3/public");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), targetPage);
  }
  return root;
}

/** Runs the middleware for one request and reports whether it called next(). */
function request(middleware, method, url) {
  let nexted = false;
  middleware({ method, url }, {}, () => (nexted = true));
  return nexted;
}

test("the project's own src/index.html wins over the template", () => {
  const root = project({ ownPage: "<p>own</p>", targetPage: "<p>qti3</p>" });
  assert.equal(activeDevPage(root, "qti3"), path.join(root, "src/index.html"));
  assert.equal(activeDevPage(project({ targetPage: "x" }), "qti3").endsWith("tspci-qti3/public/index.html"), true);
  assert.equal(activeDevPage(project(), "IMS").endsWith(path.join("public", "index.html")), true);
});

test("copyDevPage makes dist when it is gone", () => {
  const root = project({ ownPage: "<p>own</p>" });
  const dist = path.join(root, "dist");
  copyDevPage(root, dist);
  assert.equal(fs.readFileSync(path.join(dist, "index.html"), "utf8"), "<p>own</p>");
});

test("a request for the page puts dist/index.html back after dist was emptied", () => {
  const root = project({ targetPage: "<p>qti3</p>" });
  const dist = path.join(root, "dist");
  const mw = devPageMiddleware(root, dist, "qti3");
  copyDevPage(root, dist, "qti3");
  fs.rmSync(dist, { recursive: true, force: true }); // what a production build does

  assert.equal(request(mw, "GET", "/?item=1"), true);
  assert.equal(fs.readFileSync(path.join(dist, "index.html"), "utf8"), "<p>qti3</p>");

  fs.rmSync(path.join(dist, "index.html"));
  assert.equal(request(mw, "HEAD", "/index.html"), true);
  assert.equal(fs.existsSync(path.join(dist, "index.html")), true);
});

test("other requests pass untouched, and an existing page is not overwritten", () => {
  const root = project({ ownPage: "<p>own</p>" });
  const dist = path.join(root, "dist");
  const mw = devPageMiddleware(root, dist);
  assert.equal(request(mw, "GET", "/index.js"), true);
  assert.equal(fs.existsSync(path.join(dist, "index.html")), false);

  fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, "index.html"), "<p>edited in dist</p>");
  request(mw, "GET", "/");
  assert.equal(fs.readFileSync(path.join(dist, "index.html"), "utf8"), "<p>edited in dist</p>");
});
