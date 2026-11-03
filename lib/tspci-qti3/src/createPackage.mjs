import fs from "fs";
import path from "path";
import chalk from "chalk";
import yazl from "yazl";
import { itemProblems, pciFiles, qtiPackage } from "@citolab/pci-authoring";

// `tspci --target qti3`: a QTI 3 package with one item with the PCI at its default settings, a test and a manifest,
// written by @citolab/pci-authoring as an authoring system writes it (the PCI Authoring Profile, docs/spec in the tspci
// repository), so it is the same item the dev page's "QTI 3 item" download writes for its settings.

/**
 * The tspci dev page shows no button for this exporter: its "QTI 3 item" writes the same package, with the settings
 * and media chosen there. bundle() returns the path of the zip.
 */
export const label = "QTI 3 package";
export const devPage = false;

export const bundle = () => {
  const PACKAGE_ROOT_PATH = process.cwd();
  const outputDirectory = path.join(PACKAGE_ROOT_PATH, "qti3-dist");

  const configPath = path.join(PACKAGE_ROOT_PATH, "package.json");
  if (!fs.existsSync(configPath)) {
    console.error(`cannot find package.json: ${configPath}`);
    process.exit(1);
  }
  const packageData = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const typeIdentifier = packageData?.config?.tspci?.typeIdentifier;
  if (!typeIdentifier) {
    console.error(
      "Missing config.tspci.typeIdentifier in package.json. It should match the PCI typeIdentifier in your source code."
    );
    process.exit(1);
  }

  const pciFile = (packageData.main || "dist/index.js").replace(/^\//, "");
  const pciFilePath = path.join(PACKAGE_ROOT_PATH, pciFile);
  if (!fs.existsSync(pciFilePath)) {
    console.error(`PCI bundle not found: ${pciFilePath}`);
    process.exit(1);
  }
  const distDirectory = path.dirname(pciFilePath);
  const module = path.basename(pciFilePath);
  const descriptorPath = path.join(distDirectory, "authoring.json");
  if (!fs.existsSync(descriptorPath)) {
    console.error(`authoring.json not found next to the bundle (${descriptorPath}): build with tspci 3 first`);
    process.exit(1);
  }
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));

  // the PCI's files: the module, the descriptor, its fixed media and further modules (next to the module, as the
  // build put them), and the SBOM
  const files = {};
  for (const file of pciFiles(descriptor, { module })) {
    if (file === "authoring.json" && process.argv.includes("--no-authoring")) continue;
    const source = path.join(distDirectory, file);
    if (fs.existsSync(source)) files[file] = fs.readFileSync(source);
    else console.warn(chalk.yellow(`${file}: ${source} is missing, build the PCI first`));
  }
  const cssPath = path.join(distDirectory, "index.css");
  if (fs.existsSync(cssPath)) {
    // tspci bundles CSS into the module (import style from "./styles.css"). A stylesheet next to it is shipped, but
    // nothing loads it: QTI 3 has no qti-stylesheet inside a qti-portable-custom-interaction, and one in the item is
    // item content, which an authoring system does not keep with the PCI.
    console.warn(
      chalk.yellow("dist/index.css is shipped but not loaded by the PCI: import the CSS in your code, so the build bundles it")
    );
    files["index.css"] = fs.readFileSync(cssPath);
  }

  const safeType = String(typeIdentifier).replace(/[^A-Za-z0-9._-]/g, "-");
  const version = packageData.version || "0.0.0";
  const baseName = `qti3-pci-${safeType}_${version}`;
  fs.mkdirSync(outputDirectory, { recursive: true });
  const sbom = readSbom({ distDirectory, outputDirectory, baseName, packageData });
  if (sbom) files[sbom.name] = sbom.data;

  // the project's assets/ folder: files of the item, at assets/ in the package
  const itemFiles = {};
  const assetsSource = path.join(PACKAGE_ROOT_PATH, "assets");
  if (fs.existsSync(assetsSource)) {
    for (const file of collectFilesRecursive(assetsSource, assetsSource)) {
      itemFiles[path.posix.join("assets", file)] = fs.readFileSync(path.join(assetsSource, file));
    }
  }

  // the item has the default settings and no author's files: say what an author still has to fill in
  for (const problem of itemProblems(descriptor)) {
    console.warn(chalk.yellow(`the item in the package is a sample: ${problem.message} (an authoring system asks the author)`));
  }

  const itemLabel = packageData?.config?.tspci?.label;
  const entries = qtiPackage(descriptor, {
    files,
    module,
    itemFiles,
    title: itemLabel || packageData?.name || "PCI Item",
    label: itemLabel,
    interactionAttributes: { "data-version": version },
  });

  const zipPath = path.join(outputDirectory, `${baseName}.zip`);
  return zipEntries(entries, zipPath).then(() => {
    console.log(chalk.green(`created qti3 pci zip: ${path.basename(zipPath)}`));
    return zipPath;
  });
};

function collectFilesRecursive(rootDir, currentDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return collectFilesRecursive(rootDir, fullPath);
    return [path.relative(rootDir, fullPath).split(path.sep).join(path.posix.sep)];
  });
}

/** The package entries (path → bytes or text) as a compressed zip at `outPath`. */
function zipEntries(entries, outPath) {
  const zipFile = new yazl.ZipFile();
  for (const [name, data] of Object.entries(entries)) {
    zipFile.addBuffer(Buffer.isBuffer(data) ? data : Buffer.from(data), name, { compress: true });
  }
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(outPath);
    stream.on("close", () => resolve());
    stream.on("error", (err) => reject(err));
    zipFile.outputStream.on("error", (err) => reject(err)).pipe(stream);
    zipFile.end();
  });
}

// The SBOM travels inside the package, because a file next to the zip does not
// survive an import into an authoring system, and that is exactly the party
// that needs it. A copy is left next to the package for your own technical
// documentation. Use --no-include-sbom (or config.tspci.sbom.includeInPackage:
// false) to keep it out of the package, and --no-sbom to skip it altogether.
function readSbom({ distDirectory, outputDirectory, baseName, packageData }) {
  const settings = packageData?.config?.tspci?.sbom || {};
  if (settings.enabled === false || process.argv.includes("--no-sbom")) {
    return null;
  }
  const fileName = settings.fileName || "sbom.cdx.json";
  const source = path.join(distDirectory, fileName);
  if (!fs.existsSync(source)) {
    console.warn(chalk.yellow(`no SBOM found at ${source}, skipping it`));
    return null;
  }
  fs.copyFileSync(source, path.join(outputDirectory, `${baseName}.${fileName}`));
  console.log(chalk.green(`created sbom: ${baseName}.${fileName}`));

  if (settings.includeInPackage === false || process.argv.includes("--no-include-sbom")) {
    return null;
  }
  return { name: fileName, data: fs.readFileSync(source) };
}
