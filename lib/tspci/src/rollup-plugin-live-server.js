// PK: made a pull request for this https://bitbucket.org/robhicks55/rollup-plugin-live-server/pull-requests/
// WATCH argument added to live server, else this package could just be used
// https://www.npmjs.com/package/rollup-plugin-live-server
// const ls = require("live-server");

import ls from "live-server";

export function liveServer(options = {}) {
  const directories = options.directories || [];
  const params = {
  file: options.file || 'index.html',
  host: options.host || '0.0.0.0',
  logLevel: options.logLevel || 2,
  open: options.open || false,
  port: options.port ||8080,
  root: options.root || '.',
  wait: options.wait || 200,
  watch: options.watch || "",
};
if (options.mount) params.mount = options.mount;
if (options.ignore) params.ignore = options.ignore;
if (options.middleware) params.middleware = options.middleware;
if (options.cert) params.cert = options.cert;
if (options.key) params.key = options.key;
if (options.passphrase) params.passphrase = options.passphrase;

ls.start(params);
  return {
    name: 'liveServer',
    generateBundle() {
      console.log(`live-server running on ${params.port}`);
    }
  };
}
