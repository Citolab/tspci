import fs, { cp, mkdirSync } from "fs";
import path from "path";
import readline from "readline";
import chalk from "chalk";
import inquirer from "inquirer";
import { execSync } from "child_process";

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

export const init = async () => {
  console.log("adding TAO support to PCI");
  const PACKAGE_ROOT_PATH = process.cwd();
  const packageData = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT_PATH, "package.json"), "utf8"));
  const typeIdentifer = packageData.config?.tspci?.typeIdentifier;
  if (!typeIdentifer) {
    console.error(
      "No typeIdentifier found in package.json (config { tspci: { typeIdentifier: 'my-pci' }}). Add it and make sure it matches the PCI typeIdentifier property"
    );
    return;
  }
  // get first 5 chars of identifier
  const defaultShort = typeIdentifer.length > 5 ? typeIdentifer.substring(0, 5) : typeIdentifer;
  const short = (await askOption(`Enter a short name for the PCI: (default: ${defaultShort}) `)) || defaultShort;

  const defaultLabel = typeIdentifer.length > 5 ? typeIdentifer.substring(0, 5) : typeIdentifer;
  const label = (await askOption(`Enter the label of the PCI: (default: ${defaultLabel}) `)) || defaultLabel;
  const scoringsMethods = await selectOptions("Which scoring methods do you want to support?", [
    "MATCH_CORRECT",
    "NONE",
  ]);
  const scoreMethodArray = scoringsMethods.values;

  // adding short, label and typeIdentifer to packageData
  packageData.config.tspci.short = short;
  packageData.config.tspci.label = label;
  packageData.config.tspci.typeIdentifier = typeIdentifer;
  packageData.config.tspci.score = scoreMethodArray;

  packageData.devDependencies = packageData.devDependencies || {};

  // get package.json from PACKAGER_PATH
  const PACKAGER_PATH = path.join(PACKAGE_ROOT_PATH + "/node_modules/@citolab/tspci-tao");
  const packagerPackageData = JSON.parse(fs.readFileSync(path.join(PACKAGER_PATH, "package.json"), "utf8"));
  // add devDependencies from packagerPackageData to packageData
  Object.keys(packagerPackageData.devDependencies).forEach((key) => {
    packageData.devDependencies[key] = packagerPackageData.devDependencies[key];
  });

  packageData.scripts = packageData.scripts || {};
  packageData.scripts["package:tao"] = "tspci --target tao";
  // store packageData
  fs.writeFileSync(path.join(PACKAGE_ROOT_PATH, "package.json"), JSON.stringify(packageData, null, 2), "utf8");
  console.log(chalk.green("📦 Installing dependencies"));
  execSync("npm install", { stdio: [0, 1, 2] });
  console.log("Adding TAO interface to PCI");
  if (!packageData.source) {
    console.error("Failed implementing TAO interface; No source property found in package.json.");
  }

  // Determine if the file is TypeScript or JavaScript
  const isTypeScript = packageData.source.endsWith(".ts");

  const sourceFile = fs.readFileSync(path.join(PACKAGE_ROOT_PATH, packageData.source), "utf8");
  if (isTypeScript && sourceFile.indexOf("implements IMSpci<PropTypes>, TAOpci") === -1) {
    console.log("TAO interface not implemented yet; Implementing...");
    if (sourceFile.indexOf("implements IMSpci<PropTypes> {") === -1) {
      console.error("Cannot implement TAOpci interface automatically. Please implement it manually.");
    } else {
      let newSourceFile = sourceFile.replace(
        "implements IMSpci<PropTypes> {",
        "implements IMSpci<PropTypes>, TAOpci {"
      );
      // add import { TAOpci } from "@citolab/tspci-tao"; to the top of the file
      newSourceFile = `import { TAOpci } from "@citolab/tspci-tao";\r\n${newSourceFile}`;
      if (newSourceFile.indexOf(" QtiVariableJSON ") === -1) {
        newSourceFile = `import { QtiVariableJSON } from "@citolab/tspci";\r\n${newSourceFile}`;
      }
      const defaultImplementation = `
        off = () => {}; // called when setting correct response in tao
        on = (val) => {};
        trigger = (event: string, value: any) => {
          this.config.properties[event] = value;
          this.render();
        };
        resetResponse = () => {
          // used in tao to reset the response. clean-up and re-render the PCI would be best. 
          // this.render();
        };
        setResponse = (response: QtiVariableJSON) => {
          // used to set the response in tao. E.g. when the item author has set a correct response. And you refresh TAO it will call this method to set the response in the PCI in the score-editor.
        };

              `;
      const lastBracket = newSourceFile.lastIndexOf("}");
      newSourceFile =
        newSourceFile.substring(0, lastBracket) + defaultImplementation + newSourceFile.substring(lastBracket);

      fs.writeFileSync(path.join(PACKAGE_ROOT_PATH, packageData.source), newSourceFile, "utf8");
      console.log(chalk.green("TAO interface implemented"));
    }
  } else if (!isTypeScript) {
    // For JavaScript implementation
    let newSourceFile = sourceFile;

    if (sourceFile.indexOf("@implements {TAOpci}") === -1) {
      // Add @implements {TAOpci} to JSDoc of an existing method, e.g., getInstance
      newSourceFile = newSourceFile.replace("/**", `/**\n * @implements {TAOpci}`);
    }

    const jsImplementation = `
  /**
   * Called when setting correct response in tao
   * @method off
   */
  off = function() {};

  /**
   * Called when setting a value in TAO
   * @method on
   * @param {any} val
   */
  on = function(val) {};

  /**
   * Triggers an event and updates the configuration
   * @method trigger
   * @param {string} event
   * @param {any} value
   */
  trigger = function(event, value) {
    this.config.properties[event] = value;
    this.render();
  };

  /**
   * Resets the response in TAO
   * @method resetResponse
   */
  resetResponse = function() {
    // used in tao to reset the response. clean-up and re-render the PCI would be best. 
    // this.render();
  };

  /**
   * Sets the response in TAO
   * @method setResponse
   * @param {QtiVariableJSON} response
   */
  setResponse = function(response) {
    // used to set the response in tao. E.g. when the item author has set a correct response. And you refresh TAO it will call this method to set the response in the PCI in the score-editor.
  };
    `;
    const lastBracket = newSourceFile.lastIndexOf("}");
    newSourceFile = newSourceFile.substring(0, lastBracket) + jsImplementation + newSourceFile.substring(lastBracket);

    fs.writeFileSync(path.join(PACKAGE_ROOT_PATH, packageData.source), newSourceFile, "utf8");

    fs.writeFileSync(path.join(PACKAGE_ROOT_PATH, packageData.source), newSourceFile, "utf8");
    console.log(chalk.green("TAO interface implemented for JavaScript"));
  } else {
    console.log("TAO interface already implemented");
  }
  console.log(chalk.green("Done!"));
};
