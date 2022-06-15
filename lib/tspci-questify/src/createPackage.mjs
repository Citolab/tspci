import fs, { mkdirSync } from "fs";
import path from "path";
import archiver from "archiver";
import { exit } from "process";

export const bundle = () => {
  const PACKAGE_ROOT_PATH = process.cwd();
  const PACKAGER_PATH = path.join(PACKAGE_ROOT_PATH + "/node_modules/@citolab/tspci-questify");

  const outputDirectory = path.join(PACKAGE_ROOT_PATH, "dist");
  const outputDirectoryTemp = path.join(outputDirectory, "tmp");

  // remove directory to be sure it's empty
  if (fs.existsSync(outputDirectoryTemp)) {
    fs.rmdirSync(outputDirectoryTemp, { recursive: true });
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

  const questifyMetadata = path.join(path.join(PACKAGER_PATH, "questify-default"), "metadata.json");
  if (!fs.existsSync(config)) {
    console.error(`cannot find metadata.json: ${questifyMetadata}`);
    process.exit();
  }
  const rawMetadata = fs.readFileSync(questifyMetadata);
  const questifyMetadataData = JSON.parse(rawMetadata);

  const propertiesToCopy = ["width", "height"];

  copyDirectoryRecursiveSync(path.join(PACKAGER_PATH, "questify-default"), outputDirectoryTemp, false);

  const name = packageData.label
    ? packageData.label
    : packageData.name
    ? packageData.name.split("/")[packageData.name.split("/").length - 1]
    : "ci";
  const typeIdentifier = packageData.typeIdentifier;
  if (!typeIdentifier) {
    console.error("missing type identifier in package.json");
    process.exit();
  }
  questifyMetadataData.typeIdentifier = typeIdentifier;
  questifyMetadataData.title = name;
  for (const propertyName in propertiesToCopy) {
    if (packageData[propertyName]) {
      questifyMetadataData[propertyName] = packageData[propertyName];
    }
  }
  const metadataString = JSON.stringify(questifyMetadataData);
  fs.writeFileSync(path.join(outputDirectoryTemp, "metadata.json"), metadataString, "utf8");

  // copy the actual PCI file
  const pciFile = config.main || "/dist/index.js";

  // pk: add .min. to the name else QB is gonna minify it and it BREAKS
  fs.copyFileSync(path.join(PACKAGE_ROOT_PATH, pciFile), path.join(outputDirectoryTemp, "/ref/script/index.min.js"));

  // zip the folder
  const zipName = `questify-ci-${name}_${packageData.version}.ci`;
  zipDirectory(outputDirectoryTemp, path.join(outputDirectory, zipName)).then(() =>
    // fs.rmdirSync(outputDirectoryTemp, { recursive: true });
    console.log(`created questify ci zip: ${zipName}`)
  );
};

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.lstatSync(source).isDirectory() || source.endsWith("tmp")) return;
  // var operation = move ? fs.renameSync : fs.copyFileSync;
  fs.readdirSync(source).forEach(function (itemName) {
    if (!(itemName.indexOf("questify-pci-") !== -1 && itemName.indexOf(".zip") !== -1)) {
      var sourcePath = path.join(source, itemName);
      var targetPath = path.join(target, itemName);
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
