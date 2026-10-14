import fs, { mkdirSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import yazl from "yazl";

export const bundle = async () => {
  const PACKAGE_ROOT_PATH = process.cwd();

  const PACKAGER_PATH = path.join(
    PACKAGE_ROOT_PATH + "/node_modules/@citolab/tspci-tao"
  );

  // PROPERTIES CAN BE OVERRIDEN BY VALUES IN YOUR Package.json INSIDE YOUR PCI FOLDER
  // OTHER CONFIG VALUES ARE: "pciJsFile" THE BUNDLED PCI FILE DEFAULTS TO: "/dist/index.js"
  // AND icon WHICH CAN BE REFERENCED TO A SVG TO OVERRIDE THE 'LIKE' ICON.
  const propertiesToReplace = {
    typeIdentifier: "emptytypeIdentifier",
    label: "label",
    short: "short",
    score: ["MATCH_CORRECT", "NONE"],
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
      } else if (
        !/^[A-Za-z0-9]*$/.test(packageData.config.tspci[propertyName])
      ) {
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
    console.warn(
      'package.json has been migrated to use "{ config: { tspci: { typeIdentifier: ..., xx" properties.'
    );
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

  copyDirectoryRecursiveSync(
    path.join(PACKAGER_PATH, "toa_pci_default"),
    outputDirectoryTemp,
    false
  );

  // ---------------------------------------------------------------------
  // ADD THE VALUES THAT ARE SHOULD BE CONFIGURABLE WITHIN TAO
  // ---------------------------------------------------------------------

  // add variables from taoConfigValues, to be able to configurate PCI's
  let authoringOptions = null;
  let controlsOptions = null;
  const configPath = path.join(PACKAGE_ROOT_PATH, "src/config.json");

  if (fs.existsSync(configPath)) {
    let configValues;
    let configJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    // the editor hints, read the way the tspci build reads them for dist/authoring.json
    const properties = await describedProperties(PACKAGE_ROOT_PATH, packageData, configJson);
    configValues = Object.keys(configJson).reduce((acc, elem) => {
      // A config.json value is a default, or { default, editor, label, ... } (the authoring descriptor, see
      // AUTHORING.md): TAO's form gets the default, and the editor decides the field when there is one.
      const entry = configJson[elem];
      const described = entry !== null && typeof entry === "object" && !Array.isArray(entry);
      const defaultValue = described ? String(entry.default ?? "") : entry;

      let type = "string";
      if (described && (entry.editor === "integer" || entry.editor === "number")) {
        type = "number";
      } else if (described && entry.editor === "boolean") {
        type = "boolean";
      } else if (!described && /^-?\d+$/.test(String(defaultValue))) {
        type = "number";
      }
      if (!described && isBoolean(defaultValue)) {
        type = "boolean";
      }

      acc.push({
        name: `${elem}`,
        type,
        // a described default goes into the creator's code as a JS string literal, so quotes and newlines are safe
        defaultValue: described ? JSON.stringify(defaultValue) : `"${defaultValue}"`, // type === "number" ? `${defaultValue}` : `"${defaultValue}"`,
        optional: true,
        managed: described && entry.editor === "pci",
        // the typed control (formControl), only for a described setting: a plain default keeps the text field
        property: described ? properties?.[elem] : undefined,
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
        propertiesToReplace[propertyName] =
          packageData.config.tspci[propertyName];
      }
    }

    const creatorFile = path.join(outputDirectoryTemp, "imsPciCreator.js");

    replace_string_in_file(
      creatorFile,
      "###_FIRST_SCORING_METHOD_###",
      propertiesToReplace.score?.length > 0
        ? propertiesToReplace.score[0]
        : "MATCH_CORRECT"
    );
    replace_string_in_file(
      creatorFile,
      `'##__DEFAULT_VALUES__##'`,
      defaultValues
    );

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
        // a checkbox gives true/false; the PCI gets "true"/"false", as from a data- attribute
        const toText = cv.property?.editor === "boolean" ? `
        value = String(value === true || value === 'true');` : "";
        return `${cv.name} : function(interaction, value){${toText}
        //update the pci property value:
        interaction.prop('${cv.name}', value);

        //trigger change event:
        interaction.triggerPci('${cv.name}', value);
      }`;
      })
      .join(",\r\n")}
  `;

    const widgetAnswerFile = path.join(
      outputDirectoryTemp,
      "interaction/creator/widget/states/Answer.js"
    );
    replace_string_in_file(
      widgetAnswerFile,
      `'###_RD_TEMPLATES_###'`,
      JSON.stringify(propertiesToReplace.score)
        .replace("[", "")
        .replace("]", "")
    );

    const widgetQuestionFile = path.join(
      outputDirectoryTemp,
      "interaction/creator/widget/states/Question.js"
    );

    replace_string_in_file(
      widgetQuestionFile,
      `// ##__SET_VARIABLES__##`,
      setVariables
    );
    replace_string_in_file(
      widgetQuestionFile,
      `// ##__DECLARE_VARIABLES__##`,
      variableDeclaration
    );
    replace_string_in_file(
      widgetQuestionFile,
      `// ##__CALLBACK__##`,
      callbacks
    );
    // add controls in
    const propertiesFormFile = path.join(
      outputDirectoryTemp,
      "interaction/creator/tpl/propertiesForm.tpl"
    );
    const firstManaged = configValues.find((cv) => cv.managed);
    const template = `${configValues
      .map((cv) => {
        // the authoring mode's button goes above the first setting the PCI fills itself
        const button = cv === firstManaged ? authoringButton(packageData) : "";
        return `${button}${cv.property ? formControl(cv) : plainControl(cv)}`;
      })
      .join("\r\n")}
`;
    replace_string_in_file(
      propertiesFormFile,
      `<!-- ##_HTML_CONTROLS_## -->`,
      template
    );

    // name → editor of the typed controls that start from the property (see creatorControls.fragment.js)
    const typed = configValues.filter((cv) => cv.property && !["hidden", "pci"].includes(cv.property.editor));
    if (typed.length) {
      controlsOptions = Object.fromEntries(typed.map((cv) => [cv.name, controlEditor(cv.property.editor)]));
    }

    if (firstManaged) {
      authoringOptions = {
        properties: configValues.filter((cv) => cv.managed).map((cv) => cv.name),
        settings: configValues.map((cv) => cv.name),
        width: packageData.config.tspci.authoring?.width,
        height: packageData.config.tspci.authoring?.height,
      };
    }
  } else {
    console.warn(
      "Create a config.json with properties to generate a TAO config"
    );
  }

  // Typed controls and authoring mode: Question.js gets their code only when config.json asks for them. Without it the
  // marker lines go, so the file is exactly what it was before either existed.
  const questionFile = path.join(outputDirectoryTemp, "interaction/creator/widget/states/Question.js");
  const fragment = (file, marker, options) =>
    options
      ? fs
          .readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), file), "utf8")
          .replace(`'${marker}'`, () => JSON.stringify(options))
          .replace(/\s+$/, "")
      : "";
  fs.writeFileSync(
    questionFile,
    fs
      .readFileSync(questionFile, "utf8")
      .replace(/\r?\n[ \t]*\/\/ ##__CONTROLS__##/, () =>
        fragment("creatorControls.fragment.js", "##__CONTROLS_OPTIONS__##", controlsOptions)
      )
      .replace(/\r?\n[ \t]*\/\/ ##__AUTHORING__##/, () =>
        fragment("creatorAuthoring.fragment.js", "##__AUTHORING_OPTIONS__##", authoringOptions)
      ),
    "utf8"
  );

  // copy specific files
  if (fs.existsSync(path.join(PACKAGE_ROOT_PATH, "tao_pci"))) {
    copyDirectoryRecursiveSync(
      path.join(PACKAGE_ROOT_PATH, "tao_pci"),
      outputDirectoryTemp,
      false
    );
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
      replace_string_in_file(
        pathToFile,
        `##${propertyName}##`,
        propertiesToReplace[propertyName]
      );
    }
  }

  // copy the actual PCI file
  const pciFile = config.main || "/dist/index.js";

  if (
    !fs.existsSync(path.join(outputDirectoryTemp, "/interaction/runtime/js"))
  ) {
    mkdirSync(path.join(outputDirectoryTemp, "/interaction/runtime/js"));
  }

  fs.copyFileSync(
    path.join(PACKAGE_ROOT_PATH, pciFile),
    path.join(outputDirectoryTemp, "/interaction/runtime/js/index.js")
  );

  // the icon can be replaced by a custom icon
  const iconLocation = path.join(
    PACKAGE_ROOT_PATH,
    `${propertiesToReplace.typeIdentifier}.svg`
  );
  if (fs.existsSync(iconLocation)) {
    fs.copyFileSync(
      iconLocation,
      path.join(outputDirectoryTemp, "/interaction/creator/img/icon.svg")
    );
  } else {
    console.warn(
      `Cannot find svg file at: ${iconLocation} default icon will be used. To have a custom icon for the PCI in TAO add a svg file here: ${iconLocation}`
    );
  }
  // console.log(propertiesToReplace.short)

  // SBOM: shipped inside the package next to the bundle it describes, and
  // copied next to the package for your own technical documentation
  handleSbom({
    distDirectory: path.join(PACKAGE_ROOT_PATH, path.dirname((packageData.main || "dist/index.js").replace(/^\//, ""))),
    outputDirectory,
    packageTempDirectory: outputDirectoryTemp,
    packageDirectory: path.posix.join("interaction", "runtime", "js"),
    baseName: `tao-pci-${propertiesToReplace.typeIdentifier}_${packageData.version}`,
    packageData,
  });

  // zip the folder
  const zipName = `tao-pci-${propertiesToReplace.typeIdentifier}_${packageData.version}.zip`;
  zipDirectory(outputDirectoryTemp, path.join(outputDirectory, zipName)).then(
    () =>
      // fs.rmdirSync(outputDirectoryTemp, { recursive: true });
      console.log(`created tao pci zip: ${zipName}`)
  );
};

function replace_string_in_file(filename, to_replace, replace_with) {
  var data = fs.readFileSync(filename, "utf8");

  // a function, so a $ in a label or default ("$&", "$'") is not a replacement pattern
  var result = data.replace(new RegExp(to_replace, "g"), () => replace_with);
  fs.writeFileSync(filename, result, "utf8");
}

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.lstatSync(source).isDirectory() || source.endsWith("tmp")) return;
  // var operation = move ? fs.renameSync : fs.copyFileSync;
  fs.readdirSync(source).forEach(function (itemName) {
    if (
      !(itemName.indexOf("tao-pci-") !== -1 && itemName.indexOf(".zip") !== -1)
    ) {
      var sourcePath = path.join(source, itemName);
      var targetPath = path.join(target, itemName);
      if (fs.lstatSync(sourcePath).isDirectory()) {
        if (
          !fs.existsSync(targetPath) &&
          !targetPath.toLocaleLowerCase().endsWith("tmp")
        ) {
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

// The button that opens the authoring mode: config.tspci.authoring.label (a text, or one per language, of which
// TAO's {{__}} gets the English one), else "Configure…".
function authoringButton(packageData) {
  const text = readable(packageData.config.tspci.authoring?.label) || "Configure…";
  return `<div><button type="button" class="btn-info small" data-pci-authoring>{{__ "${String(text).replace(/["\\{}]/g, "")}"}}</button></div>
`;
}

// A text given per language (a label, a hint): the English one, as TAO's own strings are, else the first.
function readable(text) {
  return typeof text === "string" ? text : text?.en ?? Object.values(text ?? {})[0];
}

// The properties of the authoring descriptor, from buildDescriptor in the project's @citolab/tspci, so TAO reads the
// editor hints exactly as the build does. An older tspci without it: no typed controls, every setting a text field.
async function describedProperties(projectRoot, packageData, config) {
  let authoring;
  try {
    const file = createRequire(path.join(projectRoot, "package.json")).resolve("@citolab/tspci/src/authoring.js");
    authoring = await import(pathToFileURL(file).href);
  } catch {
    console.warn("@citolab/tspci has no authoring descriptor (src/authoring.js): TAO's form gets text fields only");
    return null;
  }
  return authoring.buildDescriptor(packageData, config).descriptor.properties;
}

// Text in the form template: as HTML, in an element or a quoted attribute, and without anything Handlebars reads
// ({{ }} and the backslash that escapes them), since a label or a default is the PCI developer's text, not template.
function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "{": "&#123;", "}": "&#125;", "\\": "&#92;" };
  return String(value).replace(/[&<>"'{}\\]/g, (c) => entities[c]);
}

// The editors creatorControls.fragment.js treats differently; the rest start from the property as text.
function controlEditor(editor) {
  return ["boolean", "enum", "color", "colorList"].includes(editor) ? editor : "text";
}

// A setting given as a plain default: the text field it always had (now with one type attribute: number for a whole
// number, which TAO's validation passes to the change callback like a text field).
function plainControl(cv) {
  const capitalizedName = cv.name.charAt(0).toUpperCase() + cv.name.slice(1);
  return `<label for="${cv.name}">{{__ "${capitalizedName}"}}</label>
        <span class="icon-help tooltipstered" data-tooltip="~ .tooltip-content:first" data-tooltip-theme="info"></span>
        <span class="tooltip-content">{{__ "${capitalizedName}"}}</span>
            <input type="${cv.type === "number" ? "number" : "text"}"
               name="${cv.name}"
               value="{{${cv.name}}}"
               placeholder="e.g. ${replaceAll(cv.defaultValue, '"', "")}"
               data-validate="${cv.optional ? "" : "$notEmpty"};">`;
}

// A described setting: the control of its editor, with its label and its hint as the tooltip. TAO's formElement
// passes changes of text fields (through its validation), selects, checkboxes and hidden fields to the change
// callbacks; the colour pickers write the setting's hidden field (creatorControls.fragment.js).
function formControl(cv) {
  const property = cv.property;
  const name = escapeHtml(cv.name);
  const label = escapeHtml(readable(property.label) || cv.name.charAt(0).toUpperCase() + cv.name.slice(1));
  const tooltip = `<span class="icon-help tooltipstered" data-tooltip="~ .tooltip-content:first" data-tooltip-theme="info"></span>
        <span class="tooltip-content">${escapeHtml(readable(property.hint) || readable(property.label) || label)}</span>`;
  const header = `<label for="${name}">${label}</label>
        ${tooltip}`;
  const value = `{{${cv.name}}}`;
  const placeholder = property.default === "" ? "" : ` placeholder="e.g. ${escapeHtml(property.default)}"`;
  const range = ["min", "max", "step"]
    .filter((key) => property[key] !== undefined && property[key] !== null && property[key] !== "")
    .map((key) => ` ${key}="${escapeHtml(property[key])}"`)
    .join("");
  switch (property.editor) {
    case "hidden":
      return "";
    case "boolean":
      return `<label>
            <input type="checkbox" name="${name}" value="true">
            <span class="icon-checkbox"></span>
            ${label}
        </label>
        ${tooltip}`;
    case "enum":
      if (!property.options?.length) return formControl({ ...cv, property: { ...property, editor: "text" } });
      return `${header}
            <select name="${name}" class="select2" data-has-search="false">${(property.options ?? [])
              .map((option) => {
                const text = readable(option.label) || option.value;
                return `
                <option value="${escapeHtml(option.value)}">${escapeHtml(text)}</option>`;
              })
              .join("")}
            </select>`;
    case "integer":
    case "number":
      return `${header}
            <input type="number" name="${name}" value="${value}"${range}${range.includes(" step=") ? "" : property.editor === "integer" ? ' step="1"' : ' step="any"'}${placeholder} data-validate=";">`;
    case "textarea":
      return `${header}
            <textarea name="${name}" rows="4"${placeholder}>${value}</textarea>`;
    // min-width:0, as TAO's creator gives a colour input a min-inline-size of 150px
    case "color":
      return `${header}
            <span data-tspci-color="${name}" style="display:flex;align-items:center;gap:6px">
                <input type="color" aria-label="${label}" style="width:44px;min-width:0;height:28px;padding:0;flex:none">
                <input type="text" aria-label="${label} (hex)" placeholder="#rrggbb" maxlength="7" style="flex:1;min-width:0">
            </span>
            <input type="hidden" name="${name}" value="${value}">`;
    case "colorList":
      return `${header}
            <span data-tspci-color-list="${name}" style="display:block">
                <span data-tspci-items style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px"></span>
                <span data-tspci-item-template hidden>
                    <span style="display:inline-flex;align-items:center;gap:2px">
                        <input type="color" style="width:36px;min-width:0;height:28px;padding:0">
                        <button type="button" class="btn-default small" title="{{__ "Remove colour"}}" style="padding:0 6px"><span class="icon-bin"></span></button>
                    </span>
                </span>
                <button type="button" class="btn-info small" data-tspci-add><span class="icon-add"></span>{{__ "Add a colour"}}</button>
            </span>
            <input type="hidden" name="${name}" value="${value}">`;
    default:
      // text, pci (the "Configure…" button above it fills it) and an editor this packager does not know
      return `${header}
            <input type="text" name="${name}" value="${value}"${placeholder} data-validate=";">`;
  }
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}

function isBoolean(val) {
  // If val is already a boolean, return true
  if (typeof val === "boolean") {
    return true;
  }

  // If val is not a string, return false
  if (typeof val !== "string") {
    return false;
  }

  // Handle string cases
  switch (val.toLowerCase().trim()) {
    case "true":
    case "yes":
    case "false":
    case "no":
      return true;
    default:
      return false;
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
    console.warn(`no SBOM found at ${source}, skipping it`);
    return "";
  }
  fs.copyFileSync(source, path.join(outputDirectory, `${baseName}.${fileName}`));
  console.log(`created sbom: ${baseName}.${fileName}`);

  if (settings.includeInPackage === false || process.argv.includes("--no-include-sbom")) {
    return "";
  }
  const target = packageDirectory ? path.join(packageTempDirectory, packageDirectory) : packageTempDirectory;
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(source, path.join(target, fileName));
  return packageDirectory ? path.posix.join(packageDirectory, fileName) : fileName;
}
