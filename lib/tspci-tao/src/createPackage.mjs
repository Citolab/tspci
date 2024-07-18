import fs, { mkdirSync } from "fs";
import path from "path";
import archiver from "archiver";

export const bundle = () => {
  const PACKAGE_ROOT_PATH = process.cwd();

  const PACKAGER_PATH = path.join(PACKAGE_ROOT_PATH + "/node_modules/@citolab/tspci-tao");

  // PROPERTIES CAN BE OVERRIDEN BY VALUES IN YOUR Package.json INSIDE YOUR PCI FOLDER
  // OTHER CONFIG VALUES ARE: "pciJsFile" THE BUNDLED PCI FILE DEFAULTS TO: "/dist/index.js"
  // AND icon WHICH CAN BE REFERENCED TO A SVG TO OVERRIDE THE 'LIKE' ICON.
  const propertiesToReplace = {
    typeIdentifier: "emptytypeIdentifier",
    label: "label",
    short: "short",
    score: ["NONE"],
  };

  const config = path.join(PACKAGE_ROOT_PATH, "package.json");
  if (!fs.existsSync(config)) {
    console.error(`cannot find package.json: ${config}`);
    process.exit();
  }
  const rawConfigData = fs.readFileSync(config);
  const packageData = JSON.parse(rawConfigData);
  let migrated = false;
  // show warning if not specified
  for (const propertyName in propertiesToReplace) {
    if (!packageData.config) {
      migrated = true;
      packageData.config = {};
    }
    if (!packageData.config.tspci) {
      migrated = true;
      packageData.config.tspci = {};
    }
    if (!packageData.config.tspci[propertyName] && packageData[propertyName]) {
      packageData.config.tspci[propertyName] = packageData[propertyName];
      delete packageData[propertyName];
      migrated = true;
    }
    if (propertyName === "typeIdentifier") {
      if (!packageData.config.tspci[propertyName]) {
        console.error(
          "'typeIdentifier' should be added as an option in package.json and should match the typeIdentifier of the PCI code file."
        );
        return;
      } else if (!/^[A-Za-z0-9]*$/.test(packageData.config.tspci[propertyName])) {
        console.error(
          "'typeIdentifier' can only contain (alpha)numeric characters. The pci does not work in TAO if typeindentifier contains a hyphen therefor we restrict all non (alpha)numeric characters. Make sure typeIdentifier of the PCI code file matches the typeidentier in package.json."
        );
        return;
      }
    } else {
      if (!packageData.config.tspci[propertyName])
        console.warn(
          `${propertyName} not specified in ${packageData.name} in package.json using { config: tspci: {${propertiesToReplace[propertyName]}}`
        );
    }
  }

  propertiesToReplace.description = packageData.description;
  propertiesToReplace.version = packageData.version;

  if (migrated) {
    console.warn('package.json has been migrated to use "{ config: { tspci: { typeIdentifier: ..., xx" properties.');
    fs.writeFileSync(config, JSON.stringify(packageData, null, 2));
  }

  const outputDirectory = path.join(PACKAGE_ROOT_PATH, "dist");
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
  } else {
    fs.rmSync(outputDirectoryTemp, { recursive: true });
    mkdirSync(outputDirectoryTemp);
  }

  // copy all toa files that will be used as base,
  // to override these files for a specific PCI: add them in the same structure in the tao_pci folder
  // of the pci.

  copyDirectoryRecursiveSync(path.join(PACKAGER_PATH, "toa_pci_default"), outputDirectoryTemp, false);

  // ---------------------------------------------------------------------
  // ADD THE VALUES THAT ARE SHOULD BE CONFIGURABLE WITHIN TAO
  // ---------------------------------------------------------------------

  // add variables from taoConfigValues, to be able to configurate PCI's
  const configPath = path.join(PACKAGE_ROOT_PATH, "src/config.json");

  if (fs.existsSync(configPath)) {
    let configValues;
    let configJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    configValues = Object.keys(configJson).reduce((acc, elem) => {
      const defaultValue = configJson[elem];

      let type = "string";
      if (Number.isInteger(parseInt(defaultValue))) {
        type = "number";
      }
      if (isBoolean(defaultValue)) {
        type = "boolean";
      }

      acc.push({
        name: `${elem}`,
        type,
        defaultValue: `"${defaultValue}"`, // type === "number" ? `${defaultValue}` : `"${defaultValue}"`,
        optional: true,
      });
      return acc;
    }, []);

    // add default values in imsPciCreator.js
    const defaultValues = `{
    ${configValues
      .map((cv) => {
        return `${cv.name}: ${cv.defaultValue}`;
      })
      .join(",")}
    };`;

    // loop through properties with values that should be replaced
    // if the value is not in the config, the default value will be used
    const defaultPackageJsonProperties = ["version", "description"];
    for (const propertyName in propertiesToReplace) {
      if (defaultPackageJsonProperties.includes(propertyName)) {
        propertiesToReplace[propertyName] = packageData[propertyName];
      } else {
        propertiesToReplace[propertyName] = packageData.config.tspci[propertyName];
      }
    }

    const creatorFile = path.join(outputDirectoryTemp, "imsPciCreator.js");

    replace_string_in_file(
      creatorFile,
      "###_FIRST_SCORING_METHOD_###",
      propertiesToReplace.score?.length > 0 ? propertiesToReplace.score[0] : "NONE"
    );
    replace_string_in_file(creatorFile, `'##__DEFAULT_VALUES__##'`, defaultValues);

    // add stuff in interaction/creator/widget/states/Question.js
    const variableDeclaration = `
    ${configValues
      .map((cv) => {
        return `var ${cv.name} = interaction.prop('${cv.name}') || ${cv.defaultValue};`;
      })
      .join("\r\n")}
    `;

    const setVariables = `
    ${configValues
      .map((cv) => {
        return `${cv.name} : ${cv.name},`;
      })
      .join("\r\n")}
    `;

    const callbacks = `${configValues
      .map((cv) => {
        return `${cv.name} : function(interaction, value){
        //update the pci property value:
        interaction.prop('${cv.name}', value);

        //trigger change event:
        interaction.triggerPci('${cv.name}', value);
      }`;
      })
      .join(",\r\n")}
  `;

    const widgetAnswerFile = path.join(outputDirectoryTemp, "interaction/creator/widget/states/Answer.js");
    replace_string_in_file(
      widgetAnswerFile,
      `'###_RD_TEMPLATES_###'`,
      JSON.stringify(propertiesToReplace.score).replace("[", "").replace("]", "")
    );

    const widgetQuestionFile = path.join(outputDirectoryTemp, "interaction/creator/widget/states/Question.js");

    replace_string_in_file(widgetQuestionFile, `// ##__SET_VARIABLES__##`, setVariables);
    replace_string_in_file(widgetQuestionFile, `// ##__DECLARE_VARIABLES__##`, variableDeclaration);
    replace_string_in_file(widgetQuestionFile, `// ##__CALLBACK__##`, callbacks);
    // add controls in
    const propertiesFormFile = path.join(outputDirectoryTemp, "interaction/creator/tpl/propertiesForm.tpl");
    const template = `${configValues
      .map((cv) => {
        const capitalizedName = cv.name.charAt(0).toUpperCase() + cv.name.slice(1);
        return `<label for="${cv.name}">{{__ "${capitalizedName}"}}</label>
        <span class="icon-help tooltipstered" data-tooltip="~ .tooltip-content:first" data-tooltip-theme="info"></span>
        <span class="tooltip-content">{{__ "${capitalizedName}"}}</span>
            <input type="text"
               name="${cv.name}"
               type="${cv.type === "string" ? "text" : cv.type === "number" ? "number" : "text"}"
               value="{{${cv.name}}}"
               placeholder="e.g. ${replaceAll(cv.defaultValue, '"', "")}"
               data-validate="${cv.optional ? "" : "$notEmpty"};">`;
      })
      .join("\r\n")}
`;
    replace_string_in_file(propertiesFormFile, `<!-- ##_HTML_CONTROLS_## -->`, template);
  } else {
    console.warn("Create a config.json with properties to generate a TAO config");
  }

  // copy specific files
  if (fs.existsSync(path.join(PACKAGE_ROOT_PATH, "tao_pci"))) {
    copyDirectoryRecursiveSync(path.join(PACKAGE_ROOT_PATH, "tao_pci"), outputDirectoryTemp, false);
  }

  // files that contain values that should be replaced
  const filesToEdit = [
    "imsPciCreator.js",
    "imsPciCreator.json",
    "interaction/creator/widget/Widget.js",
    "interaction/creator/widget/states/states.js",
    "interaction/creator/widget/states/Question.js",
    "interaction/creator/widget/states/Correct.js",
  ];

  // loop through the files and replace values.
  for (const fileToEdit of filesToEdit) {
    for (const propertyName in propertiesToReplace) {
      const pathToFile = path.join(outputDirectoryTemp, fileToEdit);
      replace_string_in_file(pathToFile, `##${propertyName}##`, propertiesToReplace[propertyName]);
    }
  }

  // copy the actual PCI file
  const pciFile = config.main || "/dist/index.js";

  if (!fs.existsSync(path.join(outputDirectoryTemp, "/interaction/runtime/js"))) {
    mkdirSync(path.join(outputDirectoryTemp, "/interaction/runtime/js"));
  }

  fs.copyFileSync(
    path.join(PACKAGE_ROOT_PATH, pciFile),
    path.join(outputDirectoryTemp, "/interaction/runtime/js/index.js")
  );

  // the icon can be replaced by a custom icon
  const iconLocation = path.join(PACKAGE_ROOT_PATH, `${propertiesToReplace.typeIdentifier}.svg`);
  if (fs.existsSync(iconLocation)) {
    fs.copyFileSync(iconLocation, path.join(outputDirectoryTemp, "/interaction/creator/img/icon.svg"));
  } else {
    console.warn(
      `Cannot find svg file at: ${iconLocation} default icon will be used. To have a custom icon for the PCI in TAO add a svg file here: ${iconLocation}`
    );
  }
  // console.log(propertiesToReplace.short)

  // zip the folder
  const zipName = `tao-pci-${propertiesToReplace.typeIdentifier}_${packageData.version}.zip`;
  zipDirectory(outputDirectoryTemp, path.join(outputDirectory, zipName)).then(() =>
    // fs.rmdirSync(outputDirectoryTemp, { recursive: true });
    console.log(`created tao pci zip: ${zipName}`)
  );
};

function replace_string_in_file(filename, to_replace, replace_with) {
  var data = fs.readFileSync(filename, "utf8");

  var result = data.replace(new RegExp(to_replace, "g"), replace_with);
  fs.writeFileSync(filename, result, "utf8");
}

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.lstatSync(source).isDirectory() || source.endsWith("tmp")) return;
  // var operation = move ? fs.renameSync : fs.copyFileSync;
  fs.readdirSync(source).forEach(function (itemName) {
    if (!(itemName.indexOf("tao-pci-") !== -1 && itemName.indexOf(".zip") !== -1)) {
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

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}

function isBoolean(string) {
  switch (string.toLowerCase().trim()) {
    case "true":
    case "yes":
    case "false":
    case "no":
      return true;

    default:
      return false;
  }
}
