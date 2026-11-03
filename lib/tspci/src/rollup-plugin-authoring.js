import fs from "fs";
import path from "path";
import { buildDescriptor, DESCRIPTOR_FILE, flattenConfig, renamedKeys } from "./authoring.js";
import { resolveMedia } from "./media.js";
import { resolveModules } from "./modules.js";

/**
 * - `import config from "./config.json"` gets the plain defaults, also when config.json carries editor hints
 *   (`{ "default": "640", "editor": "integer", ... }`), so the hints never end up in the bundle;
 * - writes dist/authoring.json, the descriptor an authoring system reads (see authoring.js), with the fixed media files.
 * Runs before @rollup/plugin-json, which then turns the flattened JSON into a module.
 */
export function authoring({ projectRoot = process.cwd(), configFile = "src/config.json" } = {}) {
  const configPath = path.resolve(projectRoot, configFile);
  return {
    name: "tspci-authoring",

    // the keys tspci 3 renamed stop the build before anything is written
    buildStart() {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
      const errors = renamedKeys(packageJson?.config?.tspci);
      if (errors.length) this.error(`${errors.join("\n")}\nSee docs/spec/MIGRATION.md in the tspci repository.`);
    },

    transform(code, id) {
      if (path.resolve(id.split("?")[0]) !== configPath) return null;
      return { code: JSON.stringify(flattenConfig(JSON.parse(code)), null, 2), map: null };
    },

    writeBundle(options) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
      const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
      // the media problems are reported by the media plugin
      const { descriptor, problems } = buildDescriptor(
        packageJson,
        config,
        resolveMedia(projectRoot, packageJson).media,
        resolveModules(projectRoot, packageJson).modules
      );
      for (const problem of problems) this.warn(problem);

      const outputDir = options.dir ?? path.dirname(options.file ?? path.join(projectRoot, "dist", "index.js"));
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, DESCRIPTOR_FILE), `${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
    },
  };
}
