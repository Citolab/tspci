import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// The dev page: dist/index.html, copied from the project's src/index.html or, without one, from the template of the
// target (public/index.html here, or @citolab/tspci-<target>/public/index.html). live-server serves it from dist, so
// it gets the reload script injected.
//
// Anything that empties dist while the dev server runs (`tspci` for a production build, `rm -rf dist`, a clean in an
// editor) takes the page with it, and the server answers "Cannot GET /" until it restarts. devPageMiddleware puts the
// page back when it is asked for and missing, so a reload is enough.

const TSPCI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the dev page can come from: the project's own src/index.html, and the target's template. */
export function devPageSources(projectRoot, target = "IMS") {
  const projectSource = path.join(projectRoot, "src/index.html");
  const templateSource =
    target === "IMS"
      ? path.join(TSPCI_DIR, "public/index.html")
      : path.join(projectRoot, "node_modules", `@citolab/tspci-${target}/public/index.html`);
  return { projectSource, templateSource };
}

/** The source in use: the project's own page wins over the template. */
export function activeDevPage(projectRoot, target = "IMS") {
  const { projectSource, templateSource } = devPageSources(projectRoot, target);
  return fs.existsSync(projectSource) ? projectSource : templateSource;
}

/** Copies the dev page to dist/index.html (making dist when it is gone) and gives the source it used. */
export function copyDevPage(projectRoot, distPath, target = "IMS") {
  const source = activeDevPage(projectRoot, target);
  if (!fs.existsSync(source)) throw new Error(`No index.html template found for dev mode. Expected: ${source}`);
  fs.mkdirSync(distPath, { recursive: true });
  fs.copyFileSync(source, path.join(distPath, "index.html"));
  return source;
}

/** Middleware for live-server: on a request for the page, puts dist/index.html back when it is missing. */
export function devPageMiddleware(projectRoot, distPath, target = "IMS") {
  return (req, res, next) => {
    const pathname = (req.url || "/").split("?")[0];
    if ((req.method === "GET" || req.method === "HEAD") && (pathname === "/" || pathname === "/index.html")) {
      if (!fs.existsSync(path.join(distPath, "index.html"))) {
        try {
          const source = copyDevPage(projectRoot, distPath, target);
          console.log(`index.html was gone from dist (a production build or a clean empties it): copied again from ${source}`);
        } catch (err) {
          console.error(err);
        }
      }
    }
    next();
  };
}
