#!/usr/bin/env node
import { loadConfigFile } from "rollup/dist/loadConfigFile.js";
import { execSync } from "child_process";
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
  if (!fs.existsSync(PACKAGE_DIST_PATH)) {
    fs.mkdirSync(PACKAGE_DIST_PATH);
  }
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
      if (event.code == "START") {
        console.log("starting build");
      }
      if (event.code == "ERROR") {
        console.log("ERROR", event);
      }
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

function selectOptions(prompt, options) {
  return inquirer.prompt([
    {
      type: "list",
      message: prompt,
      name: "value",
      choices: options,
      default: options[0],
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

function getArgValue(longName, shortName = null) {
  const longEq = args.find((arg) => arg.startsWith(`${longName}=`));
  if (longEq) {
    return longEq.slice(longName.length + 1);
  }

  const shortEq = shortName ? args.find((arg) => arg.startsWith(`${shortName}=`)) : null;
  if (shortEq) {
    return shortEq.slice(shortName.length + 1);
  }

  const longIndex = args.findIndex((arg) => arg === longName);
  if (longIndex !== -1 && args[longIndex + 1]) {
    return args[longIndex + 1];
  }

  if (shortName) {
    const shortIndex = args.findIndex((arg) => arg === shortName);
    if (shortIndex !== -1 && args[shortIndex + 1]) {
      return args[shortIndex + 1];
    }
  }

  return null;
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
  const t = args.indexOf("--target") !== -1 ? args.indexOf("--target") : args.indexOf("-t");
  const tExt = args.indexOf("--targetExt") !== -1 ? args.indexOf("--targetExt") : args.indexOf("-tx");
  const init = args.indexOf("init") >= 0;
  const targetName = t !== -1 ? `@citolab/tspci-${args[t + 1]}` : tExt !== -1 ? args[tExt + 1] : null;

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
    let pciName =
      getArgValue("--name", "-n") ||
      (await askOption(
        "What your pci identifier (typeIdentifier). this can only contain alphanumeric characters (default: myPci)  "
      )) ||
      "myPci";
    let basePath = process.cwd();
    const pathArg = getArgValue("--path", "-p");
    if (pathArg) {
      basePath = pathArg;
    }
    let destinationFolder = path.resolve(process.cwd(), basePath, pciName);
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
      getArgValue("--description", "-dsc") ||
      (await askOption("What is the description of your pci? (default: pci created with tspci)")) ||
      "pci created with tspci";

    const projectTypes = ["preact+tailwind", "typescript", "javascript"];
    const projectTypeArg = getArgValue("--project-type", "-pt");
    const selectedProjectType = projectTypeArg
      ? projectTypes.find((projectType) => projectType === projectTypeArg)
      : null;
    if (projectTypeArg && !selectedProjectType) {
      console.log(chalk.red(`Unknown project type "${projectTypeArg}". Use one of: ${projectTypes.join(", ")}`));
      return;
    }
    const options = selectedProjectType ? { value: selectedProjectType } : await selectOptions("Type of project?", projectTypes);
    const projectType = options?.value || "typescript";
    console.log(chalk.green(`Option: ${projectType}`));
    // get relative path to executable
    const cliPath = __dirname;

    // create the project folder
    fs.mkdirSync(destinationFolder, { recursive: true });

    // copy the content of preset folder to the current folder
    const presetFolder = path.resolve(cliPath, "./../preset/base");
    if (!fs.existsSync(presetFolder)) {
      console.log(chalk.red("❌ Preset folder not found"));
    }

    console.log(chalk.green("Copying files to PCI project folder"));
    copyDirAndReplaceInFiles(presetFolder, destinationFolder, pciName);
    const packageJson = path.join(destinationFolder, "package.json");
    const packageJsonContent = fs.readFileSync(packageJson, "utf8");
    let packageJsonContentJson = JSON.parse(packageJsonContent);

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

    if (projectType === "preact+tailwind") {
      console.log(chalk.green("Adding tailwind css"));

      // read postcss.config.js
      const postcssConfig = path.resolve(cliPath, "./../preset/tailwind/postcss.config.js");
      // get all plugin names
      const postcssConfigContent = fs.readFileSync(postcssConfig, "utf8");
      // get all plugin names
      // Match require statements that use either single or double quotes
      const pluginMatches = postcssConfigContent.match(/require\(["']([^"']+)["']\)/g);
      let pluginNames = [];
      if (pluginMatches) {
        pluginNames = pluginMatches.map((plugin) => plugin.replace(/require\(["']([^"']+)["']\)/, "$1"));
      } else {
        console.log("No PostCSS plugins found.");
      }
      const packageJsonCli = path.resolve(cliPath, "./../package.json");
      const packageJsonCliContent = fs.readFileSync(packageJsonCli, "utf8");
      const packageJsonCliContentJson = JSON.parse(packageJsonCliContent);
      // add all plugins to package.json and map the version to the version in tspci package.json
      let version = "latest";
      for (const pluginName of pluginNames) {
        const pluginVersion = packageJsonCliContentJson.dependencies[pluginName];
        if (pluginName === "@tailwindcss/postcss") {
          version = pluginVersion.toString();
        }
        packageJsonContentJson.devDependencies = {
          ...packageJsonContentJson.devDependencies,
          [pluginName]: pluginVersion,
        };
      }

      // add tailwindcss itself to the devDependencies
      packageJsonContentJson.devDependencies = {
        ...packageJsonContentJson.devDependencies,
        tailwindcss: version,
      };
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
      // copy tailwind config file
      copyDir(path.resolve(cliPath, "./../preset/tailwind"), destinationFolder);
    }

    if (projectType === "preact+tailwind") {
      console.log(chalk.green("Adding preact"));
      // delete index.ts
      // fs.rmSync(path.join(destinationFolder, "src/index.ts"), { force: true });
      const preactPresetFolder = path.resolve(cliPath, "./../preset/preact");
      copyDirAndReplaceInFiles(preactPresetFolder, destinationFolder, pciName);
      // add preact and @citolab/preact-store to the package json
      packageJsonContentJson.dependencies = {
        ...packageJsonContentJson.dependencies,
        preact: "^10.24.0",
        "@citolab/preact-store": "latest",
      };
      packageJsonContentJson = { ...packageJsonContentJson, source: "src/index.tsx" };
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
    }

    if (projectType === "typescript") {
      copyDirAndReplaceInFiles(
        path.resolve(cliPath, "./../preset/typescript/src"),
        path.join(destinationFolder, "src"),
        pciName
      );
      // point to the javascript file
      packageJsonContentJson.source = "src/index.ts";
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
    }

    if (projectType === "javascript") {
      copyDirAndReplaceInFiles(
        path.resolve(cliPath, "./../preset/javascript/src"),
        path.join(destinationFolder, "src"),
        pciName
      );
      // point to the javascript file
      const packageJson = path.join(destinationFolder, "package.json");
      const packageJsonContent = fs.readFileSync(packageJson, "utf8");
      let packageJsonContentJson = JSON.parse(packageJsonContent);
      packageJsonContentJson.source = "src/index.js";
      const newPackageJsonContent = JSON.stringify(packageJsonContentJson, null, 2);
      fs.writeFileSync(packageJson, newPackageJsonContent);
    }

    // run npm install in destination folder
    if (args.indexOf("--no-install") === -1) {
      console.log(chalk.green("📦 Installing dependencies"));
      execSync("npm install", { cwd: destinationFolder, stdio: [0, 1, 2] });
      execSync("npm install", { cwd: destinationFolder, stdio: [0, 1, 2] }); // Somehow this to prevent the fsevents.watch is not a function error
      console.log(chalk.green(`📦 Done!`));
      console.log(chalk.blueBright(`Navigate to ${destinationFolder} or open this folder (e.g. with vscode).`));
      console.log(chalk.blueBright(`Start the dev server with: npm run dev`));
      console.log(chalk.blueBright(`Add support for TAO with: npm run tspci -- add --target tao`));

      return;
    } else {
      console.log(chalk.yellow("Skipping npm install, run npm install in the project folder to install dependencies"));
      return;
    }
  }

  if (args.indexOf("add") !== -1) {
    const targetIndex = args.indexOf("--target");
    if (args.length <= targetIndex + 1) {
      console.error("Missing target name. Use tspci add --target target");
      return;
    }
    const version = args.indexOf("--next") !== -1 ? "next" : "latest";
    const packageFileContent = fs.readFileSync(path.join(PACKAGE_ROOT_PATH, "package.json"), "utf8");
    const packageJson = JSON.parse(packageFileContent);

    const modifyPci = () => {
      const scriptFile = path.join(path.join(path.join(NODE_MODULES, `${targetName}`), "src"), `init.mjs`);
      let init = false;
      if (fs.existsSync(scriptFile)) {
        // run init() script
        import(`file:///${scriptFile}`).then((script) => {
          if (script.init) {
            init = true;
            console.log(chalk.green(`Running init script for ${targetName}`));
            script.init();
          } else {
            if (!init) {
              console.log(chalk.red(`No init script found for ${targetName}`));
            }
          }
        });
      }
    };
    if (!packageJson.devDependencies || !packageJson.devDependencies[targetName]) {
      console.log(chalk.white(`Adding ${targetName}`));
      // install @citolab/tspci-${targetname} to devDepencies
      execSync(`npm install ${targetName}@${version} --save-dev`, {
        cwd: PACKAGE_ROOT_PATH,
        stdio: [0, 1, 2],
      });
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
      console.log("Using IMS template");
      watchBuild(true);
    } else {
      const target = args[devIndex + 1];
      watchBuild(true, target);
    }
    return;
  }

  prodBuild().then(() => {
    if (!targetName) {
      console.error("Missing target name. Use tspci --target target or tspci --targetExt target");
      return;
    }
    const scriptFile = path.join(path.join(path.join(NODE_MODULES, `${targetName}`), "src"), `createPackage.mjs`);
    import(`file:///${scriptFile}`).then((script) => {
      script.bundle();
    });
  });
};

run();
