#!/usr/bin/env node
import { loadConfigFile } from "rollup/dist/loadConfigFile.js";
import { execSync, spawn } from "child_process";
import { rollup, watch } from "rollup";
import readline from "readline";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import clear from "clear";
import figlet from "figlet";
import inquirer from "inquirer";

const args = process.argv.slice(2);

// PK: retreive dirname, most of the time automaticly inserted in es modules
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT_PATH = process.cwd();
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist");
const NODE_MODULES = path.join(process.cwd(), "node_modules");

// https://rollupjs.org/guide/en/#programmatically-loading-a-config-file
const watchBuild = (devServer = false, target = "IMS") => {
  const rollupFile = devServer ? "rollup.config.dev.js" : "rollup.config.js";

  // PK: this ensures tailwind watches changes
  // PK: See link here: https://github.com/tailwindlabs/tailwindcss/issues/7063
  process.env.ROLLUP_WATCH = "true";

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
        let fileToCopy;
        if (target == "IMS") {
          fileToCopy = path.join(__dirname, `../public/index.html`);
        } else {
          fileToCopy = path.join(NODE_MODULES, `@citolab/tspci-${target}/public/index.html`);
        }
        fs.copyFile(fileToCopy, path.join(PACKAGE_DIST_PATH, "index.html"), (err) => {
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

function promptYesNo(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${prompt} (y/n): `, (answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
        console.log(chalk.green("Yes"));
        resolve(true);
      } else if (normalizedAnswer === "n" || normalizedAnswer === "no") {
        console.log(chalk.red("No"));
        resolve(false);
      } else {
        console.log("Invalid input. Please enter 'y' or 'n'.");
        resolve(promptYesNo(prompt));
      }
    });
  }).finally(() => {
    rl.close();
  });
}

function selectOptions(prompt, options) {
  return inquirer.prompt([
    {
      type: "checkbox",
      message: prompt,
      name: "values",
      choices: options.map((o) => ({ name: o, checked: true })),
    },
  ]);
}

function askOption(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (option) => {
      rl.close();
      resolve(option);
    });
  });
}

function createDirectoryIfNotExists(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(presetFolder, destinationFolder) {
  for (const fileOfDir of fs.readdirSync(presetFolder)) {
    // check if object is a file or a folder
    if (fs.statSync(path.join(presetFolder, fileOfDir)).isDirectory()) {
      copyDir(path.join(presetFolder, fileOfDir), path.join(destinationFolder, fileOfDir));
    } else {
      const filename = fileOfDir;
      const file = path.join(presetFolder, filename);
      const newFileLocation = path.join(destinationFolder, filename);
      createDirectoryIfNotExists(newFileLocation);
      fs.copyFileSync(file, newFileLocation);
    }
  }
}

function copyDirAndReplaceInFiles(presetFolder, destinationFolder, pciName) {
  for (const fileOfDir of fs.readdirSync(presetFolder)) {
    // check if object is a file or a folder
    if (fs.statSync(path.join(presetFolder, fileOfDir)).isDirectory()) {
      copyDirAndReplaceInFiles(path.join(presetFolder, fileOfDir), path.join(destinationFolder, fileOfDir), pciName);
    } else {
      const fileExtensionsToCheck = [".js", ".ts", ".tsx"];
      const filename = fileOfDir;
      const file = path.join(presetFolder, filename);
      const fileExtension = path.extname(file);
      const newFileLocation = path.join(destinationFolder, filename);
      createDirectoryIfNotExists(newFileLocation);
      if (fileExtensionsToCheck.includes(fileExtension)) {
        // remove ###___name___### in the file content to the name
        let content = fs.readFileSync(file, "utf8");
        content = content.replace(/###___PCI_NAME___###/g, pciName);
        // write newContent to newFileLocation
        fs.writeFileSync(newFileLocation, content, "utf8");
      } else {
        fs.copyFileSync(file, path.join(destinationFolder, filename));
      }
    }
  }
}

const run = async () => {
  const help = args.indexOf("--help") >= 0 || args.indexOf("-h") >= 0;
  const watch = args.indexOf("--watch") >= 0 || args.indexOf("-w") >= 0;
  const dev = args.indexOf("--dev") >= 0 || args.indexOf("-d") >= 0;
  const target = args.indexOf("--target") >= 0 || args.indexOf("-t") >= 0;
  const init = args.indexOf("init") >= 0;

  if (help) {
    console.log(`•\t${chalk.blueBright("--help -h")} list these commands`);
    console.log(`•\t${chalk.blueBright("--build")} build the project`);
    console.log(`•\t${chalk.blueBright("--watch")} watch the files`);
    console.log(`•\t${chalk.blueBright("--target")} build a prod item and bundle for platform`);
    console.log("\n");
    console.log(
      `${chalk.blueBright("tspci init")} creates a new project \n•\t${chalk.blueBright(
        "--force"
      )} deletes the directory if it already exists \n•\t${chalk.blueBright(
        "--no-install"
      )} don't install dependencies \n•\t${chalk.blueBright("--path")} path to create the project in`
    );
    console.log(
      `${chalk.blueBright("tspci add --target")} adds a new target to the project. E.g. tspci add --target=tao`
    );
    console.log("\n\n");
    return;
  }

  if (init) {
    clear();
    console.log(chalk.green(figlet.textSync("@citolab/tspci", { horizontalLayout: "full" })));

    // prompt for name
    let pciName = (await askOption("What your pci identifier (typeIdentifier). this can only contain alphanumeric characters (default: myPci)  ")) || "myPci";
    let destinationFolder = path.join(process.cwd(), pciName);
    if (args.find((arg) => arg.startsWith("--path"))) {
      const pathIndex = args.findIndex((arg) => arg.startsWith("--path"));
      destinationFolder = path.join(process.cwd(), path.join(args[pathIndex].split("=")[1], pciName));
    }
    // if args contains --force then delete the directory if already exists
    if (args.indexOf("--force") >= 0 || args.indexOf("-f") >= 0) {
      if (fs.existsSync(destinationFolder)) {
        console.log(chalk.yellow("🗑 Force deleting directory"));
        fs.rmSync(destinationFolder, { recursive: true, force: true });
      }
    }
    // check if directory exists
    while (pciName && fs.existsSync(destinationFolder)) {
      console.log(
        chalk.red(
          "The directory already exists, please choose another name. Running tscpi init --force will delete the directory"
        )
      );
      return;
    }
    // check if contains other characters than letters and numbers
    if (!/^[a-zA-Z]+$/.test(pciName)) {
      console.log(
        chalk.yellow("The identifier of your pci can only contain alphanumeric characters, stripping others")
      );
      pciName = pciName.replace(/[^a-zA-Z]/g, "");
    }
    console.log(chalk.green(`pci: ${pciName}`));
    const description =
      (await askOption("What is the description of your pci? (default: pci created with tspci)")) ||
      "pci created with tspci";

    const options = await selectOptions("Would you like to add other features?", ["tailwind css", "preact"]);
    console.log(chalk.green(`Options: ${options.values.length === 0 ? "none" : options.values}`));
    // get relative path to executable
    const cliPath = __dirname;

    // create the project folder
    fs.mkdirSync(destinationFolder);

    // copy the content of preset folder to the current folder
    const presetFolder = path.resolve(cliPath, "./../preset/base");
    if (!fs.existsSync(presetFolder)) {
      console.log(chalk.red("❌ Preset folder not found"));
    }

    console.log(chalk.green("Copying files to PCI project folder"));
    copyDirAndReplaceInFiles(presetFolder, destinationFolder, pciName);
    const packageJson = path.join(destinationFolder, "package.json");
    const packageJsonContent = fs.readFileSync(packageJson, "utf8");
    const packageJsonContentJson = JSON.parse(packageJsonContent);

    const kebabCasedProjectName = pciName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    packageJsonContentJson.name = kebabCasedProjectName;
    packageJsonContentJson.description = description;
    packageJsonContentJson.author = os?.userInfo()?.username;
    if (!packageJsonContentJson.config) {
      packageJsonContentJson.config = {};
    }
    if (!packageJsonContentJson.config.tspci) {
      packageJsonContentJson.config.tspci = {};
    }
    packageJsonContentJson.config.tspci.typeIdentifier = pciName;

    if (options.values.includes("tailwind css")) {
      console.log(chalk.green("Adding tailwind css"));

      // read postcss.config.js
      const postcssConfig = path.resolve(cliPath, "./../preset/tailwind/postcss.config.js");
      const postcssConfigContent = fs.readFileSync(postcssConfig, "utf8");
      // get all plugin names
      const pluginNames = postcssConfigContent
        .match(/require\('(.*)'\)/g)
        .map((plugin) => plugin.replace(/require\('(.*)'\)/, "$1"));
      const packageJsonCli = path.resolve(cliPath, "./../package.json");
      const packageJsonCliContent = fs.readFileSync(packageJsonCli, "utf8");
      const packageJsonCliContentJson = JSON.parse(packageJsonCliContent);
      // add all plugins to package.json and map the version to the version in tspci package.json
      for (const pluginName of pluginNames) {
        const pluginVersion = packageJsonCliContentJson.dependencies[pluginName];
        packageJsonContentJson.devDependencies = {
          ...packageJsonContentJson.devDependencies,
          [pluginName]: pluginVersion,
        };
      }
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
      // copy tailwind config file
      copyDir(path.resolve(cliPath, "./../preset/tailwind"), destinationFolder);
    }

    if (options.values.includes("preact")) {
      console.log(chalk.green("Adding preact"));
      const packageJson = path.join(destinationFolder, "package.json");
      const packageJsonContent = fs.readFileSync(packageJson, "utf8");
      let packageJsonContentJson = JSON.parse(packageJsonContent);
      // delete index.ts
      fs.rmSync(path.join(destinationFolder, "src/index.ts"), { force: true });
      const preactPresetFolder = path.resolve(cliPath, "./../preset/preact");
      copyDirAndReplaceInFiles(preactPresetFolder, destinationFolder, pciName);
      // add preact and @citolab/preact-store to the package json
      packageJsonContentJson.dependencies = {
        ...packageJsonContentJson.dependencies,
        preact: "^10.13.2",
        "@citolab/preact-store": "latest",
      };
      packageJsonContentJson = { ...packageJsonContentJson, source: "src/index.tsx" };
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
    }

    // run npm install in destination folder
    if (args.indexOf("--no-install") === -1) {
      console.log(chalk.green("📦 Installing dependencies"));
      execSync("npm install", { cwd: destinationFolder, stdio: [0, 1, 2] });
      console.log(chalk.green(`📦 Done!`));
      console.log(chalk.blueBright(`Navigate to ${destinationFolder} or open this folder (e.g. with vscode).`));
      console.log(chalk.blueBright(`Start the dev server with: npm run dev`));
      console.log(chalk.blueBright(`Add support for TAO with: npm run tspci -- add --target tao`));
       
      return;
    } else {
      console.log(chalk.yellow("Skipping npm install, run npm install in the project folder to install dependencies"));
    }
  }

  if (args.indexOf("add") !== -1) {
    const targetIndex = args.indexOf("--target");
    if (args.length <= targetIndex + 1) {
      console.error("Missing target name. Use tspci add --target target");
      return;
    }
    const version = args.indexOf("--next") !== -1 ? "next" : "latest";
    const targetname = args[targetIndex + 1];
    const packageFileContent = fs.readFileSync(path.join(PACKAGE_ROOT_PATH, "package.json"), "utf8");
    const packageJson = JSON.parse(packageFileContent);

    const modifyPci = () => {
      const scriptFile = path.join(
        path.join(path.join(path.join(NODE_MODULES, `@citolab`), `tspci-${targetname}`), "src"),
        `init.mjs`
      );
      let init = false;
      if (fs.existsSync(scriptFile)) {
        // run init() script
        import(`file:///${scriptFile}`).then((script) => {
          if (script.init) {
            init = true;
            console.log(chalk.green(`Running init script for @citolab/tspci-${targetname}`));
            script.init();
          } else {
            if (!init) {
              console.log(chalk.red(`No init script found for @citolab/tspci-${targetname}`));
            }
          }
        });
      }

    };

    // check if `@citolab/tspci-${targetname}]}` is already in devDependencies
    if (!packageJson.devDependencies || !packageJson.devDependencies[`@citolab/tspci-${targetname}`]) {
      console.log(chalk.white(`Adding @citolab/tspci-${targetname}`));
      // install @citolab/tspci-${targetname} to devDepencies
      execSync(`npm install @citolab/tspci-${targetname}@${version} --save-dev`, { cwd: PACKAGE_ROOT_PATH, stdio: [0, 1, 2] });
    }
    modifyPci();

    return;
  }

  if (watch) {
    watchBuild(false);
    return;
  }

  if (dev) {
    const devIndex = args.indexOf("--dev");
    if (args.length <= devIndex + 1) {
      console.error("Missing dev target name. Using IMS template");
      watchBuild(true);
    } else {
      const target = args[devIndex + 1];
      watchBuild(true, target);
    }
    return;
  }

  prodBuild().then(() => {
    if (target) {
      const targetIndex = args.indexOf("--target");
      if (args.length <= targetIndex + 1) {
        console.error("Missing target name. Use tspci --target target");
      }
      const targetname = args[targetIndex + 1];
      const scriptFile = path.join(
        path.join(path.join(path.join(NODE_MODULES, `@citolab`), `tspci-${targetname}`), "src"),
        `createPackage.mjs`
      );
      import(`file:///${scriptFile}`).then((script) => {
        script.bundle();
      });
    }
  });
};

run();
