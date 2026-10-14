// The authoring descriptor: what an authoring system needs to know to configure and score a PCI.
//
// A PCI developer writes two files tspci projects already have:
//   src/config.json        the data- properties: a default value, or { default, editor, label, ... }
//   package.json           config.tspci: typeIdentifier, label, markup slots and the response shape
// The build turns them into
//   the bundle             only the defaults (flattenConfig), as before
//   dist/authoring.json    the descriptor (buildDescriptor), shipped next to the bundle like the SBOM
// See AUTHORING.md (in every project tspci init creates) and the readme, "Authoring systems".

export const DESCRIPTOR_VERSION = "0";
export const DESCRIPTOR_FILE = "authoring.json";

/**
 * Editors for a data- property. An authoring system that does not know one shows a text field.
 * `pci`: the PCI fills it itself, in its authoring mode (`getAuthoringInstance`, see AUTHORING.md "Authoring mode").
 */
export const PROPERTY_EDITORS = ["text", "textarea", "integer", "number", "boolean", "enum", "color", "colorList", "hidden", "pci"];

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/** config.json → the plain defaults the PCI receives (every value a string, as a data- attribute gives it). */
export function flattenConfig(config) {
  const flat = {};
  for (const [key, entry] of Object.entries(config ?? {})) {
    flat[key] = isObject(entry) ? String(entry.default ?? "") : String(entry);
  }
  return flat;
}

/** A plain config.json value, as tspci PCIs always had: the editor follows from the value (as tspci-tao does). */
const editorFor = (value) => (/^(true|false)$/.test(value) ? "boolean" : /^-?\d+$/.test(value) ? "integer" : "text");

function toProperty(key, entry, problems) {
  if (!isObject(entry)) {
    const value = String(entry);
    return { editor: editorFor(value), default: value };
  }
  const { default: value = "", editor = "text", $comment, ...rest } = entry;
  if (!PROPERTY_EDITORS.includes(editor)) {
    problems.push(`config.json ${key}: unknown editor "${editor}" (one of ${PROPERTY_EDITORS.join(", ")})`);
  }
  if (editor === "enum") {
    const options = Array.isArray(rest.options) ? rest.options : [];
    if (!options.length) problems.push(`config.json ${key}: an enum needs options`);
    rest.options = options.map((o) => (isObject(o) ? o : { value: String(o) }));
    if (value !== "" && !rest.options.some((o) => String(o.value) === String(value))) {
      problems.push(`config.json ${key}: the default "${value}" is not one of the options`);
    }
  }
  return { editor, default: String(value), ...rest };
}

function checkResponse(response, problems) {
  if (!response) return;
  const cardinality = response.cardinality ?? "single";
  if (!["single", "multiple", "ordered", "record"].includes(cardinality)) {
    problems.push(`config.tspci.response.cardinality: "${cardinality}" is not a QTI cardinality`);
  }
  if (cardinality === "record") {
    const fields = Object.entries(response.fields ?? {});
    if (!fields.length) problems.push("config.tspci.response: a record needs fields");
    for (const [name, field] of fields) {
      if (!field?.baseType) problems.push(`config.tspci.response.fields.${name}: baseType is missing`);
    }
  } else if (!response.baseType) {
    problems.push("config.tspci.response: baseType is missing");
  }
}

/**
 * The authoring mode of a PCI: present when a property has editor `pci`. config.tspci.authoring adds a label for the
 * button that opens it and the size the PCI would like for it.
 */
function toAuthoring(authoring, properties, problems) {
  const managed = Object.keys(properties).filter((key) => properties[key].editor === "pci");
  if (!managed.length) {
    if (authoring) problems.push("config.tspci.authoring: no property in config.json has editor \"pci\", so there is nothing to author");
    return null;
  }
  return { properties: managed, ...(isObject(authoring) ? authoring : {}) };
}

/**
 * The descriptor of a PCI project. `problems` lists what an authoring system could not use (an unknown editor, an
 * enum default that is not an option, a record field without a base type); the build reports them as warnings.
 */
export function buildDescriptor(packageJson, config) {
  const tspci = packageJson?.config?.tspci ?? {};
  const problems = [];
  if (!tspci.typeIdentifier) problems.push("package.json config.tspci.typeIdentifier is missing");

  const properties = {};
  for (const [key, entry] of Object.entries(config ?? {})) properties[key] = toProperty(key, entry, problems);

  const response = tspci.response ?? { cardinality: "single", baseType: "string" };
  checkResponse(response, problems);
  const authoring = toAuthoring(tspci.authoring, properties, problems);

  return {
    descriptor: {
      descriptorVersion: DESCRIPTOR_VERSION,
      typeIdentifier: tspci.typeIdentifier ?? "",
      version: packageJson?.version ?? "",
      label: tspci.label ?? packageJson?.name ?? "",
      properties,
      markup: tspci.markup ?? {},
      response,
      ...(tspci.score ? { score: tspci.score } : {}),
      ...(authoring ? { authoring } : {}),
    },
    problems,
  };
}
