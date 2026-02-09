import fs, { mkdirSync } from "fs";
import path from "path";
import archiver from "archiver";
import chalk from "chalk";

export const bundle = () => {
  const PACKAGE_ROOT_PATH = process.cwd();
  const outputDirectory = path.join(PACKAGE_ROOT_PATH, "qti3-dist");
  const outputDirectoryTemp = path.join(outputDirectory, "tmp");

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

  const pciConfigPath = path.join(PACKAGE_ROOT_PATH, "src", "config.json");
  const pciConfig = fs.existsSync(pciConfigPath)
    ? JSON.parse(fs.readFileSync(pciConfigPath, "utf8"))
    : {};

  const itemIdentifier = "ITM-PCI";
  const testIdentifier = "TST-PCI";
  const testPartIdentifier = "TP-1";
  const sectionIdentifier = "S-1";

  const itemTitle =
    pciConfig.title ||
    pciConfig.label ||
    packageData?.config?.tspci?.label ||
    packageData?.name ||
    "PCI Item";
  const itemLabel = pciConfig.label || packageData?.config?.tspci?.label || "";
  const promptText = pciConfig.prompt || "";
  const dataVersion = packageData.version || "1.0.0";

  const pciFile = packageData.main || "dist/index.js";
  const pciFileRelative = pciFile.startsWith("/") ? pciFile.slice(1) : pciFile;
  const pciFilePath = path.join(PACKAGE_ROOT_PATH, pciFileRelative);
  if (!fs.existsSync(pciFilePath)) {
    console.error(`PCI bundle not found: ${pciFilePath}`);
    process.exit(1);
  }

  const pciCssPath = path.join(PACKAGE_ROOT_PATH, "dist", "index.css");
  const hasCss = fs.existsSync(pciCssPath);

  // clean temp dir
  if (fs.existsSync(outputDirectoryTemp)) {
    fs.rmSync(outputDirectoryTemp, { recursive: true });
  }
  if (!fs.existsSync(outputDirectory)) {
    mkdirSync(outputDirectory);
  }
  mkdirSync(outputDirectoryTemp, { recursive: true });

  const itemsDir = path.join(outputDirectoryTemp, "items");
  const interactionJsDir = path.join(outputDirectoryTemp, "interaction", "runtime", "js");
  const interactionCssDir = path.join(outputDirectoryTemp, "interaction", "runtime", "css");
  const assetsDir = path.join(outputDirectoryTemp, "assets");
  mkdirSync(itemsDir, { recursive: true });
  mkdirSync(interactionJsDir, { recursive: true });

  // copy PCI bundle (and css if present)
  const pciJsTarget = path.join(interactionJsDir, "index.js");
  fs.copyFileSync(pciFilePath, pciJsTarget);
  let pciCssTarget = "";
  if (hasCss) {
    mkdirSync(interactionCssDir, { recursive: true });
    pciCssTarget = path.join(interactionCssDir, "index.css");
    fs.copyFileSync(pciCssPath, pciCssTarget);
  }

  // copy assets if present
  const assetsSource = path.join(PACKAGE_ROOT_PATH, "assets");
  const assetFiles = [];
  if (fs.existsSync(assetsSource)) {
    copyDirectoryRecursiveSync(assetsSource, assetsDir);
    collectFilesRecursive(assetsDir, assetsDir).forEach((relPath) => {
      assetFiles.push(path.posix.join("assets", relPath));
    });
  }

  // write item
  const itemXml = buildItemXml({
    identifier: itemIdentifier,
    title: itemTitle,
    label: itemLabel,
    prompt: promptText,
    typeIdentifier,
    dataVersion,
  });
  const itemPath = path.join(itemsDir, `${itemIdentifier}.xml`);
  fs.writeFileSync(itemPath, itemXml, "utf8");

  // write assessment test
  const testXml = buildTestXml({
    identifier: testIdentifier,
    title: `${itemTitle} Test`,
    testPartIdentifier,
    sectionIdentifier,
    itemHref: `items/${itemIdentifier}.xml`,
  });
  const testPath = path.join(outputDirectoryTemp, "assessmentTest.xml");
  fs.writeFileSync(testPath, testXml, "utf8");

  // write manifest
  const manifestXml = buildManifestXml({
    itemHref: `items/${itemIdentifier}.xml`,
    testHref: "assessmentTest.xml",
    pciJsHref: "interaction/runtime/js/index.js",
    pciCssHref: hasCss ? "interaction/runtime/css/index.css" : "",
    assetHrefs: assetFiles,
  });
  const manifestPath = path.join(outputDirectoryTemp, "imsmanifest.xml");
  fs.writeFileSync(manifestPath, manifestXml, "utf8");

  // zip output
  const safeType = String(typeIdentifier).replace(/[^A-Za-z0-9._-]/g, "-");
  const version = packageData.version || "0.0.0";
  const zipName = `qti3-pci-${safeType}_${version}.zip`;
  zipDirectory(outputDirectoryTemp, path.join(outputDirectory, zipName)).then(() => {
    console.log(chalk.green(`created qti3 pci zip: ${zipName}`));
  });
};

function buildItemXml({ identifier, title, label, prompt, typeIdentifier, dataVersion }) {
  const labelAttr = label ? ` label=\"${xmlEscape(label)}\"` : "";
  const promptXml = prompt
    ? `\n      <qti-prompt>${xmlEscape(prompt)}</qti-prompt>`
    : "";
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<qti-assessment-item xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\"
  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
  xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\"
  identifier=\"${xmlEscape(identifier)}\" title=\"${xmlEscape(title)}\"${labelAttr} adaptive=\"false\" time-dependent=\"false\" xml:lang=\"en\">
  <qti-response-declaration identifier=\"RESPONSE\" cardinality=\"single\" base-type=\"string\"/>
  <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-portable-custom-interaction response-identifier=\"RESPONSE\" module=\"${xmlEscape(
      typeIdentifier
    )}\" custom-interaction-type-identifier=\"${xmlEscape(
      typeIdentifier
    )}\" data-version=\"${xmlEscape(dataVersion)}\">
      <qti-interaction-modules>
        <qti-interaction-module id=\"${xmlEscape(
          typeIdentifier
        )}\" primary-path=\"../../interaction/runtime/js/index\"></qti-interaction-module>
      </qti-interaction-modules>${promptXml}
      <qti-interaction-markup></qti-interaction-markup>
    </qti-portable-custom-interaction>
  </qti-item-body>
</qti-assessment-item>
`;
}

function buildTestXml({ identifier, title, testPartIdentifier, sectionIdentifier, itemHref }) {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\"
  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
  xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd\"
  identifier=\"${xmlEscape(identifier)}\" title=\"${xmlEscape(title)}\" xml:lang=\"en\">
  <qti-test-part identifier=\"${xmlEscape(testPartIdentifier)}\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">
    <qti-assessment-section identifier=\"${xmlEscape(sectionIdentifier)}\" title=\"Section 1\" visible=\"true\">
      <qti-assessment-item-ref identifier=\"ITEMREF-1\" href=\"${xmlEscape(itemHref)}\"/>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>
`;
}

function buildManifestXml({ itemHref, testHref, pciJsHref, pciCssHref, assetHrefs }) {
  const resources = [];

  const pciJsId = "RES-PCI-JS";
  const pciCssId = "RES-PCI-CSS";
  const itemId = "RES-ITEM";
  const testId = "RES-TEST";

  resources.push({
    id: itemId,
    type: "imsqti_item_xmlv3p0",
    href: itemHref,
    files: [itemHref],
    dependencies: [pciJsId, ...(pciCssHref ? [pciCssId] : []), ...assetHrefs.map((_, i) => `RES-ASSET-${i + 1}`)],
  });

  resources.push({
    id: testId,
    type: "imsqti_test_xmlv3p0",
    href: testHref,
    files: [testHref],
    dependencies: [itemId],
  });

  resources.push({
    id: pciJsId,
    type: "webcontent",
    href: pciJsHref,
    files: [pciJsHref],
    dependencies: [],
  });

  if (pciCssHref) {
    resources.push({
      id: pciCssId,
      type: "css3",
      href: pciCssHref,
      files: [pciCssHref],
      dependencies: [],
    });
  }

  assetHrefs.forEach((href, i) => {
    resources.push({
      id: `RES-ASSET-${i + 1}`,
      type: "webcontent",
      href,
      files: [href],
      dependencies: [],
    });
  });

  const resourcesXml = resources
    .map((res) => {
      const deps = res.dependencies
        .map((dep) => `    <dependency identifierref=\"${dep}\"/>`)
        .join("\n");
      const files = res.files
        .map((file) => `    <file href=\"${xmlEscape(file)}\"/>`)
        .join("\n");
      return `  <resource identifier=\"${res.id}\" type=\"${res.type}\" href=\"${xmlEscape(
        res.href
      )}\">
${files}
${deps}
  </resource>`;
    })
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<manifest xmlns=\"http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1\"
  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
  xsi:schemaLocation=\"http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd\"
  identifier=\"QTI3-PACKAGE-1\">
  <metadata>
    <schema>QTI Package</schema>
    <schemaversion>3.0.0</schemaversion>
  </metadata>
  <organizations/>
  <resources>
${resourcesXml}
  </resources>
</manifest>
`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.lstatSync(source).isDirectory() || source.endsWith("tmp")) return;
  fs.readdirSync(source).forEach((itemName) => {
    const sourcePath = path.join(source, itemName);
    const targetPath = path.join(target, itemName);
    if (fs.lstatSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyDirectoryRecursiveSync(sourcePath, targetPath);
    } else {
      if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      }
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      fs.copyFileSync(sourcePath, targetPath, 0);
    }
  });
}

function collectFilesRecursive(rootDir, currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(rootDir, fullPath));
    } else {
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join(path.posix.sep);
      files.push(relPath);
    }
  });
  return files;
}

function zipDirectory(sourceDir, outPath) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}
