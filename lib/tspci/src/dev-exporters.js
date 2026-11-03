import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

// The exporters of a PCI project, for the dev page's Download. An exporter is what `tspci --target <name>` and
// `tspci --targetExt <package>` run: a package with src/createPackage.mjs that exports bundle(). It shows up on the dev
// page when the project depends on it (dependencies or devDependencies), so @citolab/tspci-tao, -qti3 and -qbci, and
// an exporter of your own, alike. For the dev page:
//   export const bundle = async () => { ...; return pathOfTheFileItWrote; }   // also when it is a promise
//   export const label = "TAO package";                                       // optional: the button text
//
//   GET /__tspci/exporters             [{ name, label }]
//   GET /__tspci/export?name=<package> runs bundle() and sends the file it wrote

export const EXPORTER_SCRIPT = "src/createPackage.mjs";

/** The folder of an installed package, found from the project as Node looks for it ("exports" do not matter). */
function packageDir(projectRoot, name) {
  const require = createRequire(path.join(projectRoot, "package.json"));
  return (require.resolve.paths(name) ?? [])
    .map((modules) => path.join(modules, name))
    .find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
}

/** The project's dependencies that are exporters: [{ name, script }]. tspci itself is not one. */
export function findExporters(projectRoot) {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) => name !== "@citolab/tspci");
  return names.flatMap((name) => {
    const dir = packageDir(projectRoot, name);
    const script = dir && path.join(dir, EXPORTER_SCRIPT);
    return script && fs.existsSync(script) ? [{ name, script }] : [];
  });
}

const load = (script) => import(pathToFileURL(script).href);

/** The exporters with their button text: [{ name, label }]. One that does not load or has no bundle() is left out. */
export async function describeExporters(projectRoot) {
  const out = [];
  for (const { name, script } of findExporters(projectRoot)) {
    try {
      const module = await load(script);
      if (typeof module.bundle === "function") out.push({ name, label: typeof module.label === "string" ? module.label : name });
    } catch (error) {
      console.warn(`dev page: exporter ${name} does not load: ${error?.message || error}`);
    }
  }
  return out;
}

/** Runs the exporter `name` and gives the path of the file it wrote. */
export async function runExporter(projectRoot, name) {
  const exporter = findExporters(projectRoot).find((e) => e.name === name);
  if (!exporter) throw Object.assign(new Error(`${name} is not an exporter of this project`), { status: 404 });
  const file = await (await load(exporter.script)).bundle();
  if (typeof file !== "string" || !fs.existsSync(file)) {
    throw new Error(`${name}: bundle() did not return the path of the file it wrote, so the dev page cannot download it`);
  }
  return file;
}

/** The dev server's middleware for the two routes above. One export at a time: exporters write to dist/. */
export function exportersMiddleware(projectRoot) {
  let running = null;
  return async function exporters(req, res, next) {
    const url = new URL(req.url, "http://dev");
    try {
      if (url.pathname === "/__tspci/exporters") {
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(await describeExporters(projectRoot)));
      }
      if (url.pathname !== "/__tspci/export") return next();
      if (running) throw Object.assign(new Error(`${running} is still exporting`), { status: 409 });
      running = url.searchParams.get("name") ?? "";
      const file = await runExporter(projectRoot, running).finally(() => (running = null));
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(file)}"`);
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      res.statusCode = error?.status ?? 500;
      res.end(String(error?.message || error));
    }
  };
}
