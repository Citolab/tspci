import fs, { mkdirSync } from "fs";
import path from "path";
import chalk from "chalk";
import yazl from "yazl";

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
  const assessmentItemPathCandidates = [
    path.join(PACKAGE_ROOT_PATH, "src", "qti-assessment-item.xml"),
    path.join(PACKAGE_ROOT_PATH, "qti-assessment-item.xml"),
  ];
  const assessmentItemPath = assessmentItemPathCandidates.find((candidatePath) =>
    fs.existsSync(candidatePath)
  );
  if (!assessmentItemPath) {
    console.error(
      "Missing qti-assessment-item.xml. Expected at src/qti-assessment-item.xml or qti-assessment-item.xml."
    );
    process.exit(1);
  }
  const assessmentItemSourceXml = fs.readFileSync(assessmentItemPath, "utf8");
  const assessmentItemPortableInteraction = parsePortableInteractionFromAssessmentItemXml(
    assessmentItemSourceXml
  );
  const selectedStylesheetCss = resolveSelectedStylesheetCss(
    PACKAGE_ROOT_PATH,
    assessmentItemPortableInteraction.stylesheetHref
  );
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
  const resourcesPciDir = path.join(outputDirectoryTemp, "resources", "pci");
  const resourcesStylesheetDir = path.join(
    outputDirectoryTemp,
    "resources",
    "css_stylesheet"
  );
  const assetsDir = path.join(outputDirectoryTemp, "assets");
  mkdirSync(itemsDir, { recursive: true });
  mkdirSync(resourcesPciDir, { recursive: true });
  if (selectedStylesheetCss) {
    mkdirSync(resourcesStylesheetDir, { recursive: true });
  }

  // copy PCI bundle (and css if present)
  const pciJsTarget = path.join(resourcesPciDir, "index.js");
  fs.copyFileSync(pciFilePath, pciJsTarget);
  let pciCssTarget = "";
  if (hasCss) {
    pciCssTarget = path.join(resourcesPciDir, "index.css");
    fs.copyFileSync(pciCssPath, pciCssTarget);
  }
  let selectedStylesheetCssHref = "";
  if (selectedStylesheetCss) {
    const styleTargetPath = path.join(
      resourcesStylesheetDir,
      selectedStylesheetCss.fileName
    );
    fs.copyFileSync(selectedStylesheetCss.absolutePath, styleTargetPath);
    selectedStylesheetCssHref = path.posix.join(
      "resources",
      "css_stylesheet",
      selectedStylesheetCss.fileName
    );
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
  const itemXml = assessmentItemSourceXml;
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
    pciJsHref: "resources/pci/index.js",
    pciCssHref: hasCss ? "resources/pci/index.css" : "",
    stylesheetCssHref: selectedStylesheetCssHref,
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

function buildManifestXml({
  itemHref,
  testHref,
  pciJsHref,
  pciCssHref,
  stylesheetCssHref,
  assetHrefs,
}) {
  const resources = [];

  const pciJsId = "RES-PCI-JS";
  const pciCssId = "RES-PCI-CSS";
  const stylesheetCssId = "RES-STYLESHEET-CSS";
  const itemId = "RES-ITEM";
  const testId = "RES-TEST";

  resources.push({
    id: itemId,
    type: "imsqti_item_xmlv3p0",
    href: itemHref,
    files: [itemHref],
    dependencies: [
      pciJsId,
      ...(pciCssHref ? [pciCssId] : []),
      ...(stylesheetCssHref ? [stylesheetCssId] : []),
      ...assetHrefs.map((_, i) => `RES-ASSET-${i + 1}`),
    ],
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

  if (stylesheetCssHref) {
    resources.push({
      id: stylesheetCssId,
      type: "css3",
      href: stylesheetCssHref,
      files: [stylesheetCssHref],
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

function parsePortableInteractionFromAssessmentItemXml(xmlText) {
  const source = String(xmlText || "");
  if (!source.trim()) {
    return { interactionMarkupHtml: "", stylesheetHref: "" };
  }
  const pciMatch = source.match(
    /<qti-portable-custom-interaction\b[\s\S]*?>([\s\S]*?)<\/qti-portable-custom-interaction>/i
  );
  if (!pciMatch) {
    return { interactionMarkupHtml: "", stylesheetHref: "" };
  }
  const pciInner = pciMatch[1];
  const interactionMarkupMatch = pciInner.match(
    /<qti-interaction-markup\b[^>]*>([\s\S]*?)<\/qti-interaction-markup>/i
  );
  const stylesheetMatch = pciInner.match(
    /<qti-stylesheet\b[^>]*href=["']([^"']+)["'][^>]*>/i
  );
  return {
    interactionMarkupHtml: interactionMarkupMatch ? interactionMarkupMatch[1].trim() : "",
    stylesheetHref: stylesheetMatch ? stylesheetMatch[1].trim() : "",
  };
}

function resolveSelectedStylesheetCss(packageRootPath, stylesheetHref) {
  const stylesFolder = path.join(packageRootPath, "css_stylesheet");
  if (!fs.existsSync(stylesFolder) || !fs.lstatSync(stylesFolder).isDirectory()) {
    return null;
  }
  const stylesheetStyleMatch = String(stylesheetHref || "")
    .trim()
    .match(/(?:^|\/)([a-z0-9_-]+)\.css$/i);
  const selectedStyleRaw = String(stylesheetStyleMatch?.[1] || "")
    .trim()
    .toLowerCase();
  if (!selectedStyleRaw) {
    return null;
  }
  if (!/^[a-z0-9_-]+$/.test(selectedStyleRaw)) {
    return null;
  }
  const fileName = `${selectedStyleRaw}.css`;
  const absolutePath = path.join(stylesFolder, fileName);
  if (!fs.existsSync(absolutePath) || !fs.lstatSync(absolutePath).isFile()) {
    return null;
  }
  return { fileName, absolutePath };
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
  const zipFile = new yazl.ZipFile();
  addDirectoryToZip(zipFile, sourceDir, sourceDir);
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(outPath);
    stream.on("close", () => resolve());
    stream.on("error", (err) => reject(err));
    zipFile.outputStream.on("error", (err) => reject(err)).pipe(stream);
    zipFile.end();
  });
}

function addDirectoryToZip(zipFile, rootDir, currentDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      addDirectoryToZip(zipFile, rootDir, fullPath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join("/");
    zipFile.addFile(fullPath, relativePath, { compress: true });
  }
}
