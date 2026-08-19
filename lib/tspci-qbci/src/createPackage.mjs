"use strict";
import fs, { mkdirSync } from "fs";
import path from "path";
import chalk from "chalk";
import yazl from "yazl";

export const bundle = () => {
  const PACKAGE_ROOT_PATH = process.cwd();
  const PACKAGER_PATH = path.join(PACKAGE_ROOT_PATH + "/node_modules/@citolab/tspci-qbci");

  const outputDirectory = path.join(PACKAGE_ROOT_PATH, "ci-dist");
  const outputDirectoryTemp = path.join(outputDirectory, "tmp");

  // remove directory to be sure it's empty
  if (fs.existsSync(outputDirectoryTemp)) {
    fs.rmSync(outputDirectoryTemp, { recursive: true });
  }

  // re-create the directory
  if (!fs.existsSync(outputDirectory)) {
    mkdirSync(outputDirectory);
  }
  if (!fs.existsSync(outputDirectoryTemp)) {
    mkdirSync(outputDirectoryTemp);
  }
  const config = path.join(PACKAGE_ROOT_PATH, "package.json");
  if (!fs.existsSync(config)) {
    console.error(`cannot find package.json: ${config}`);
    process.exit();
  }
  const rawConfigData = fs.readFileSync(config);
  const packageData = JSON.parse(rawConfigData);

  // PACKAGE_ROOT_PATH
  let questifyMetadata = path.join(PACKAGE_ROOT_PATH, "metadata.json");
  if (!fs.existsSync(questifyMetadata)) {
    console.error(`cannot find metadata.json: ${questifyMetadata}`);
    questifyMetadata = path.join(path.join(PACKAGER_PATH, "questify-default"), "metadata.json");
  }

  const rawMetadata = fs.readFileSync(questifyMetadata);
  const questifyMetadataData = JSON.parse(rawMetadata);

  const propertiesToReplace = {
    typeIdentifier: "emptytypeIdentifier",
  };
  copyDirectoryRecursiveSync(path.join(PACKAGER_PATH, "questify-default"), outputDirectoryTemp, false);

  const name = packageData.label
    ? packageData.label
    : packageData.name
      ? packageData.name.split("/")[packageData.name.split("/").length - 1]
      : "ci";

  for (const propertyName in propertiesToReplace) {
    if (propertyName === "typeIdentifier") {
      if (!packageData.config?.tspci[propertyName]) {
        console.error(
          "'typeIdentifier' should be added as an option in package.json and should match the typeIdentifier of the PCI code file.",
        );
        return;
      } else {
        if (!packageData.config?.tspci[propertyName])
          console.info(
            `${propertyName} not specified in ${packageData.name} in package.json using { config: tspci: {${propertiesToReplace[propertyName]}}`,
          );
      }
    }
    if (packageData.config.tspci[propertyName]) {
      propertiesToReplace[propertyName] = packageData.config.tspci[propertyName];
    }
  }

  for (const propertyName in propertiesToReplace) {
    questifyMetadataData[propertyName] = propertiesToReplace[propertyName];
  }

  const metadataString = JSON.stringify(questifyMetadataData);
  fs.writeFileSync(path.join(outputDirectoryTemp, "metadata.json"), metadataString, "utf8");

  // copy the actual PCI file
  const pciFile = config.main || "/dist/index.js";

  // pk: add .min. to the name else QB is gonna minify it and it BREAKS
  const scriptPath = path.join(outputDirectoryTemp, "/ref/script");
  if (!fs.existsSync(scriptPath)) {
    fs.mkdirSync(scriptPath);
  }
  const minifiedFilePath = path.join(scriptPath, "/index.min.js");
  const maxJsFileSize = 499; // the facet player has a limit of 500kb for js files
  fs.copyFileSync(path.join(PACKAGE_ROOT_PATH, pciFile), minifiedFilePath);

  // make changes to the if files found in ./assets in the root of the project
  // add media files to manifest.json and copy them to the output directory
  // replace 'assets/' with 'ref/media/' in the minified js file
  const assetsFolderPath = path.join(PACKAGE_ROOT_PATH, "assets");
  const media = getMediaPathFilesArray(assetsFolderPath);
  if (media.length > 0) {
    const manifestRaw = fs.readFileSync(path.join(outputDirectoryTemp, "ref/json/manifest.json"), "utf8");
    let manifestData = JSON.parse(manifestRaw);
    manifestData = { ...manifestData, media };

    // check if ref/media folder exists, if not create it
    const mediaPath = path.join(outputDirectoryTemp, "ref/media");
    if (!fs.existsSync(mediaPath)) {
      fs.mkdirSync(mediaPath);
    }

    fs.writeFileSync(path.join(outputDirectoryTemp, "ref/json/manifest.json"), JSON.stringify(manifestData), "utf8");
    copyDirectoryRecursiveSync(assetsFolderPath, path.join(outputDirectoryTemp, "ref/media"));
  }

  isMaxFileSize(maxJsFileSize, minifiedFilePath);

  // SBOM: shipped inside the package next to the bundle it describes, and
  // copied next to the package for your own technical documentation
  handleSbom({
    distDirectory: path.join(PACKAGE_ROOT_PATH, path.dirname((packageData.main || "dist/index.js").replace(/^\//, ""))),
    outputDirectory,
    packageTempDirectory: outputDirectoryTemp,
    packageDirectory: path.posix.join("ref", "script"),
    baseName: `${name}_${packageData.version}`,
    packageData,
  });

  // zip the folder
  const zipName = `${name}_${packageData.version}.ci`;
  zipDirectory(outputDirectoryTemp, path.join(outputDirectory, zipName)).then(() =>
    // fs.rmdirSync(outputDirectoryTemp, { recursive: true });
    console.log(`created questify ci zip: ${zipName}`),
  );
};

function getMediaPathFilesArray(assetsFolderPath) {
  if (!fs.existsSync(assetsFolderPath)) {
    console.log(chalk.yellow(`Assets folder not found: ${assetsFolderPath}`));
    return [];
  }

  const mediaFiles = [];
  const files = fs.readdirSync(assetsFolderPath);

  files.forEach((file) => {
    // check if file is an image, if not skip
    if (!file.match(/\.(png|jpe?g|gif|svg)$/)) {
      return;
    }

    const filePath = `ref/media/${file}`;
    mediaFiles.push(filePath);
  });

  return mediaFiles;
}

function isMaxFileSize(maxFileSize, filePath) {
  const fileSizeInBytes = fs.statSync(filePath).size;
  const fileSizeInKilobytes = (fileSizeInBytes / 1024).toFixed(2);
  if (parseFloat(fileSizeInKilobytes) > maxFileSize) {
    // js file to big
    console.log(chalk.red(`❗️Warning, minified file size of ${maxFileSize}kb exceeded: ${fileSizeInKilobytes} KB.❗️`));
    console.log(chalk.red(`This will result in a packagestream error in the player.`));
  } else {
    // js file is ok
    console.log(`✅ minified js file size: ${fileSizeInKilobytes} KB (max: ${maxFileSize} KB)`);
  }
}

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.lstatSync(source).isDirectory() || source.endsWith("tmp")) return;
  // var operation = move ? fs.renameSync : fs.copyFileSync;
  fs.readdirSync(source).forEach(function (itemName) {
    if (!(itemName.indexOf("questify-pci-") !== -1 && itemName.indexOf(".zip") !== -1)) {
      const sourcePath = path.join(source, itemName);
      const targetPath = path.join(target, itemName);
      if (fs.lstatSync(sourcePath).isDirectory()) {
        if (!fs.existsSync(targetPath) && !targetPath.toLocaleLowerCase().endsWith("tmp")) {
          fs.mkdirSync(targetPath);
        }
        copyDirectoryRecursiveSync(sourcePath, targetPath);
      } else {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        fs.copyFileSync(sourcePath, targetPath, 0);
      }
    }
  });
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

// The SBOM travels inside the package, because a file next to the zip does not
// survive an import into another system, and that is exactly the party that
// needs it. A copy is left next to the package for your own technical
// documentation. Use --no-include-sbom (or config.tspci.sbom.includeInPackage:
// false) to keep it out of the package, and --no-sbom to skip it altogether.
function handleSbom({ distDirectory, outputDirectory, packageTempDirectory, packageDirectory, baseName, packageData }) {
  const settings = packageData?.config?.tspci?.sbom || {};
  if (settings.enabled === false || process.argv.includes("--no-sbom")) {
    return "";
  }
  const fileName = settings.fileName || "sbom.cdx.json";
  const source = path.join(distDirectory, fileName);
  if (!fs.existsSync(source)) {
    console.warn(chalk.yellow(`no SBOM found at ${source}, skipping it`));
    return "";
  }
  fs.copyFileSync(source, path.join(outputDirectory, `${baseName}.${fileName}`));
  console.log(chalk.green(`created sbom: ${baseName}.${fileName}`));

  if (settings.includeInPackage === false || process.argv.includes("--no-include-sbom")) {
    return "";
  }
  const target = packageDirectory ? path.join(packageTempDirectory, packageDirectory) : packageTempDirectory;
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(source, path.join(target, fileName));
  return packageDirectory ? path.posix.join(packageDirectory, fileName) : fileName;
}
