import livereload from "rollup-plugin-livereload";
// PK: not the official npm package, but a copy, needed watch functionality
import { liveServer } from "./rollup-plugin-live-server.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";
import fs from "fs";
import path from "path";
import rollupConfig from "./rollup.config.js"; // Make sure this exports an object with `output` and `plugins`

const PACKAGE_ROOT_PATH = process.cwd();
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist");

// Configure live server
const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"]],
  open: true,
  wait: 500,
  watch: PACKAGE_DIST_PATH,
  middleware: [
    (req, res, next) => {
      if (req.method === "POST" && req.url === "/__tspci/upload-asset") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 5 * 1024 * 1024) {
            res.statusCode = 413;
            res.end("Payload too large");
            req.destroy();
          }
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body || "{}");
            const originalName = String(payload.fileName || "upload.png");
            const safeName = originalName.replace(/[^A-Za-z0-9._-]/g, "_");
            const base64 = String(payload.contentBase64 || "");
            const bytes = Buffer.from(base64, "base64");
            const assetsDir = path.join(PACKAGE_ROOT_PATH, "assets");
            const distAssetsDir = path.join(PACKAGE_ROOT_PATH, "dist", "assets");
            fs.mkdirSync(assetsDir, { recursive: true });
            fs.mkdirSync(distAssetsDir, { recursive: true });
            fs.writeFileSync(path.join(assetsDir, safeName), bytes);
            fs.writeFileSync(path.join(distAssetsDir, safeName), bytes);
            const href = `/assets/${safeName}`;
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ href, fileName: safeName }));
          } catch (error) {
            res.statusCode = 500;
            res.end("Failed to upload asset");
          }
        });
        return;
      }
      if (req.method === "POST" && req.url === "/__tspci/save-qti-assessment-item") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2 * 1024 * 1024) {
            res.statusCode = 413;
            res.end("Payload too large");
            req.destroy();
          }
        });
        req.on("end", () => {
          try {
            fs.writeFileSync(path.join(PACKAGE_ROOT_PATH, "src", "qti-assessment-item.xml"), body, "utf8");
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.end("Failed to save qti-assessment-item.xml");
          }
        });
        return;
      }
      next();
    },
  ],
});

// Configure copy plugin to watch for changes
const watchassets = copyFiles({
  targets: [
    { src: "./src/**/*.json", dest: "dist" },
    { src: "./src/**/*.html", dest: "dist" },
    { src: "./src/**/*.xml", dest: "dist" },
    { src: "./css_stylesheet/**/*.css", dest: "dist/css_stylesheet" },
    { src: "./src/**/*.svg", dest: "dist" },
    { src: "./src/**/*.png", dest: "dist" },
  ],
});

// Modify the existing Rollup config
const newRollupConfig = {
  ...rollupConfig,
  output: rollupConfig.output.map((output) => ({
    ...output,
    sourcemap: true, // Ensure sourcemaps are enabled
  })),
  plugins: [
    ...rollupConfig.plugins, // Keep existing plugins
    watchassets, // Add your custom watch functionality
    livereload(PACKAGE_DIST_PATH), // Reload after copying
    livesrvr, // Start the live server
  ],
};

export default newRollupConfig;
