#!/usr/bin/env node
import loadConfigFile from "rollup/dist/loadConfigFile.js";
import { rollup, watch } from "rollup";
import path from "path";
import fs from "fs";

const args = process.argv.slice(2);

// PK: retreive dirname, most of the time automaticly inserted in es modules
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT_PATH = process.cwd();
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist");
const NODE_MODULES = path.join(process.cwd(), "node_modules");

// https://rollupjs.org/guide/en/#programmatically-loading-a-config-file
const watchBuild = (devServer = false) => {
  const rollupFile = devServer ? "rollup.config.dev.js" : "rollup.config.js";

  fs.rmSync(PACKAGE_DIST_PATH, { recursive: true, force: true });
  !fs.existsSync(PACKAGE_DIST_PATH) && fs.mkdirSync(PACKAGE_DIST_PATH);

  if (devServer) {
    try {
      if (fs.existsSync(path.join(PACKAGE_ROOT_PATH, "src/index.html"))) {
        fs.copyFile(
          path.join(PACKAGE_ROOT_PATH, "src/index.html"),
          path.join(PACKAGE_DIST_PATH, "index.html"),
          (err) => {
            if (err) throw err;
            console.log("using index.html found in src/index.html, copied to dist");
          }
        );
      } else {
        fs.copyFile(path.join(__dirname, "../public/index.html"), path.join(PACKAGE_DIST_PATH, "index.html"), (err) => {
          if (err) throw err;
          console.log("using index.html was copied to /dist folder pci");
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  loadConfigFile(path.resolve(__dirname, rollupFile), {}).then(async ({ options, warnings }) => {
    console.log(`We currently have ${warnings.count} warnings`);
    warnings.flush();
    const watcher = watch(options);
    watcher.on("event", (event) => {
      event.code == "START" && console.log("starting build");
      event.code == "ERROR" && console.log("ERROR", event);
    });
    watcher.on("event", ({ result }) => {
      if (result) {
        result.close();
      }
    });
    watcher.close();
  });
};

const prodBuild = async () => {
  fs.rmSync(path.join(PACKAGE_ROOT_PATH, "dist"), { recursive: true, force: true });
  return loadConfigFile(path.resolve(__dirname, "rollup.config.prod.js"), {}).then(async ({ options, warnings }) => {
    console.log(`We currently have ${warnings.count} warnings`);
    warnings.flush();
    for (const optionsObj of options) {
      const bundle = await rollup(optionsObj);
      await Promise.all(optionsObj.output.map(bundle.write));
    }

    // if supplying your own index.html, this should be copied to the dist folder
    try {
      if (fs.existsSync(path.join(PACKAGE_ROOT_PATH, "src/index.html"))) {
        fs.copyFile(
          path.join(PACKAGE_ROOT_PATH, "src/index.html"),
          path.join(PACKAGE_DIST_PATH, "index.html"),
          (err) => {
            if (err) throw err;
            console.log(`using ${PACKAGE_ROOT_PATH}, "src/index.html", copied to ${PACKAGE_DIST_PATH}`);
          }
        );
      }
    } catch (err) {
      console.error(err);
    }
  });
};

const run = async () => {
  const help = args.indexOf("--help") >= 0 || args.indexOf("-h") >= 0;
  const watch = args.indexOf("--watch") >= 0 || args.indexOf("-w") >= 0;
  const dev = args.indexOf("--dev") >= 0 || args.indexOf("-d") >= 0;
  const target = args.indexOf("--target") >= 0 || args.indexOf("-t") >= 0;

  if (help) {
    console.log("--help -h list these commands");
    console.log("--build a one of build of your item");
    console.log("--watch watch the files");
    console.log("--target build a prod item and bundle for platform");
    return;
  }

  if (watch) {
    watchBuild(false);
    return;
  }

  if (dev) {
    watchBuild(true);
    return;
  }

  prodBuild().then(() => {
    if (target) {
      const targetIndex = args.indexOf("--target");
      if (args.length <= targetIndex + 1) {
        console.error("Missing target name. Use tspci --target target");
      }
      const targetname = args[targetIndex + 1];
      const scriptFile = path.join(NODE_MODULES, `@citolab\\tspci-${targetname}\\src\\createPackage.mjs`);
      import(`file:///${scriptFile}`).then((script) => {
        script.bundle();
      });
    }
  });
};

run();
