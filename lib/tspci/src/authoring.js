// The authoring descriptor: what an authoring system needs to know to configure and score a PCI.
//
// A PCI developer writes two files tspci projects already have:
//   src/config.json        the data- properties: a default value, or { default, editor, label, ... }
//   package.json           config.tspci: typeIdentifier, label, markup slots, fixed media and the response shape
// The build turns them into
//   the bundle             only the defaults (flattenConfig), as before
//   dist/authoring.json    the descriptor (buildDescriptor), shipped next to the bundle like the SBOM
// See AUTHORING.md (in every project tspci init creates) and the readme, "Authoring systems". The descriptor is the
// one of the PCI authoring profile, docs/spec/README.md, and has to pass docs/spec/authoring.schema.json.

import { mediaDescriptor } from "./media.js";
import { modulesDescriptor } from "./modules.js";

export const DESCRIPTOR_VERSION = "1.0";
export const DESCRIPTOR_FILE = "authoring.json";

/**
 * Editors for a data- property. An authoring system that does not know one shows a text field.
 * `pci`: the PCI fills it itself, in its authoring mode (`getAuthoringInstance`, see AUTHORING.md "Authoring mode").
 */
/** Properties that players and authoring systems set themselves (data-version, data-base-url): no PCI may declare them. */
export const RESERVED_PROPERTIES = ["version", "baseUrl"];

export const PROPERTY_EDITORS = ["text", "textarea", "integer", "number", "boolean", "enum", "color", "colorList", "hidden", "pci"];

/** How an authoring system may find the correct response itself: `properties` = the PCI has getCorrectResponse(properties). */
export const CORRECT_RESPONSE_SOURCES = ["properties"];

/** The margin a score rule may give a response or a record field: `range` for numbers, `area` for points. */
export const TOLERANCES = { range: ["integer", "float"], area: ["point"] };

/**
 * How an item with the PCI may be scored, the first being the default:
 *   match_correct  the response equals the correct response (QTI's match_correct template)
 *   custom         the author writes the response processing (a rule a comparison cannot express)
 *   human          a person scores it (external-scored="human" on the outcome)
 *   none           never scored: a tool such as a ruler or a calculator; only on its own
 */
export const SCORING = ["match_correct", "custom", "human", "none"];

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

/** A margin only fits a base type it can measure: a range on numbers, an area on points. */
function checkTolerance(where, tolerance, baseType, problems) {
  if (tolerance === undefined) return;
  const fits = TOLERANCES[tolerance];
  if (!fits) {
    problems.push(`${where}.tolerance: "${tolerance}" is not one of ${Object.keys(TOLERANCES).join(", ")}`);
  } else if (baseType && !fits.includes(baseType)) {
    problems.push(`${where}.tolerance: "${tolerance}" needs a base type ${fits.join(" or ")}, not ${baseType}`);
  }
}

/** Hints on a record field from before the profile: the author answers the PCI for the value (docs/spec 3.6.1). */
const FIELD_EDITOR_HINTS = ["editor", "media", "frameField", "coordinates"];

/**
 * `when` on a record field: the field is only part of the response for these property values,
 * { "<property>": ["value", ...] }. Each property must exist; an enum's values must be among its options.
 */
function checkWhen(path, when, properties, problems) {
  if (when === undefined) return;
  if (!isObject(when) || !Object.keys(when).length) {
    problems.push(`${path}: an object of property → values, e.g. { "task": ["momentAndPlace"] }`);
    return;
  }
  for (const [name, values] of Object.entries(when)) {
    const property = properties[name];
    if (!property) {
      problems.push(`${path}: "${name}" is not a setting in config.json`);
    } else if (!Array.isArray(values) || !values.length || values.some((v) => typeof v !== "string")) {
      problems.push(`${path}.${name}: a list of values as strings`);
    } else if (property.editor === "enum") {
      const options = (property.options ?? []).map((o) => String(o.value));
      for (const value of values) if (!options.includes(value)) problems.push(`${path}.${name}: "${value}" is not one of its options`);
    }
  }
}

function checkResponse(response, problems, properties = {}) {
  if (!response) return;
  const cardinality = response.cardinality ?? "single";
  if (!["single", "multiple", "ordered", "record"].includes(cardinality)) {
    problems.push(`config.tspci.response.cardinality: "${cardinality}" is not a QTI cardinality`);
  }
  if (cardinality === "record") {
    const fields = Object.entries(response.fields ?? {});
    if (!fields.length) problems.push("config.tspci.response: a record needs fields");
    for (const [name, field] of fields) {
      const where = `config.tspci.response.fields.${name}`;
      if (!field?.baseType) problems.push(`${where}: baseType is missing`);
      checkTolerance(where, field?.tolerance, field?.baseType, problems);
      checkWhen(`${where}.when`, field?.when, properties, problems);
      const hints = FIELD_EDITOR_HINTS.filter((key) => field?.[key] !== undefined);
      if (hints.length) {
        problems.push(
          `${where}: ${hints.join(", ")} not in the PCI authoring profile: the author answers the PCI for the value, with a margin from tolerance (docs/spec 3.6.1)`
        );
      }
    }
    if (response.tolerance !== undefined) problems.push("config.tspci.response.tolerance: a record has a tolerance per field, not one for all");
  } else {
    if (!response.baseType) problems.push("config.tspci.response: baseType is missing");
    // A margin on a list would mean a margin per value: no authoring system scores that, so only single responses.
    if (response.tolerance !== undefined && cardinality !== "single") {
      problems.push(`config.tspci.response.tolerance: only a single response can have one, not ${cardinality}`);
    } else {
      checkTolerance("config.tspci.response", response.tolerance, response.baseType, problems);
    }
  }
}

/**
 * The tspci 2 names, renamed in tspci 3 (docs/spec/MIGRATION.md), with what to write instead. These fail the build:
 * left alone, a tool would quietly become a scored question.
 */
export function renamedKeys(tspci = {}) {
  const errors = [];
  if (tspci.score !== undefined || tspci.role !== undefined) {
    // tspci 2: a tool by role, or by a score of only NONE without a role; NONE on a question meant scored by a person
    const onlyNone = Array.isArray(tspci.score) && tspci.score.length > 0 && tspci.score.every((s) => s === "NONE");
    const tool = tspci.role === "tool" || (tspci.role === undefined && onlyNone);
    const old = { MATCH_CORRECT: "match_correct", CUSTOM: "custom", NONE: tool ? "none" : "human" };
    const scoring = Array.isArray(tspci.score) ? tspci.score.map((s) => old[s] ?? s) : tspci.role === "tool" ? ["none"] : ["match_correct"];
    errors.push(`config.tspci.score and role are replaced by scoring (tspci 3): write "scoring": ${JSON.stringify([...new Set(scoring)])}`);
  }
  if (tspci.correctResponse === "settings") {
    errors.push('config.tspci.correctResponse "settings" is now "properties" (tspci 3)');
  }
  return errors;
}

/**
 * How the PCI may be scored, and where the correct response can come from. `none` (a tool) stands on its own; a tool
 * has no correct response, so correctResponse makes no sense on it. Without scoring: match_correct.
 */
function toScoring(tspci, problems) {
  let scoring = tspci.scoring ?? ["match_correct"];
  if (!Array.isArray(scoring) || !scoring.length) {
    problems.push(`config.tspci.scoring: a list of one or more of ${SCORING.join(", ")}`);
    scoring = ["match_correct"];
  }
  for (const s of scoring) if (!SCORING.includes(s)) problems.push(`config.tspci.scoring: "${s}" is not one of ${SCORING.join(", ")}`);
  scoring = [...new Set(scoring.filter((s) => SCORING.includes(s)))];
  if (!scoring.length) scoring = ["match_correct"];
  if (scoring.includes("none") && scoring.length > 1) {
    problems.push('config.tspci.scoring: "none" (a tool) is never scored, so it cannot go with other scoring');
    scoring = ["none"];
  }
  const tool = scoring[0] === "none";
  const source = tspci.correctResponse;
  if (source !== undefined && source !== "settings" && !CORRECT_RESPONSE_SOURCES.includes(source)) {
    problems.push(`config.tspci.correctResponse: "${source}" is not one of ${CORRECT_RESPONSE_SOURCES.join(", ")}`);
  }
  if (CORRECT_RESPONSE_SOURCES.includes(source) && tool) problems.push("config.tspci.correctResponse: a tool has no correct response");
  return { scoring, tool, correctResponse: CORRECT_RESPONSE_SOURCES.includes(source) && !tool ? source : undefined };
}

/**
 * The authoring mode of a PCI: present when a property has editor `pci`. config.tspci.authoring adds a label for the
 * button that opens it and the size the PCI would like for it. Its `properties` are always the ones with editor `pci`
 * (an authoring system writes only those on Done): a list of its own in config.tspci.authoring is reported, not used.
 */
function toAuthoring(authoring, properties, markup, problems) {
  const managed = Object.keys(properties).filter((key) => properties[key].editor === "pci");
  // markup slots with editor pci: the authoring mode makes their file (getMedia)
  const slots = Object.keys(markup ?? {}).filter((slot) => markup[slot]?.editor === "pci");
  if (!managed.length && !slots.length) {
    if (authoring) problems.push("config.tspci.authoring: no property in config.json and no markup slot has editor \"pci\", so there is nothing to author");
    return null;
  }
  const { properties: own, ...rest } = isObject(authoring) ? authoring : {};
  if (own !== undefined) {
    problems.push(
      `config.tspci.authoring.properties is not used: the authoring mode fills the settings with editor "pci" in config.json (${managed.join(", ")}); give a setting that editor instead`
    );
  }
  return { ...rest, properties: managed, ...(slots.length ? { markup: slots } : {}) };
}

const BASE_TYPES = ["boolean", "directedPair", "duration", "file", "float", "identifier", "integer", "pair", "point", "string", "uri"];

/** config.tspci.templateVariables: the template variables the PCI reads, { "<identifier>": { baseType, cardinality? } }. */
function checkTemplateVariables(variables, problems) {
  if (variables === undefined) return undefined;
  if (!isObject(variables)) {
    problems.push('config.tspci.templateVariables: an object of identifier → { "baseType": ... }');
    return undefined;
  }
  for (const [name, variable] of Object.entries(variables)) {
    const where = `config.tspci.templateVariables.${name}`;
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name)) problems.push(`${where}: not a QTI identifier`);
    if (!BASE_TYPES.includes(variable?.baseType)) problems.push(`${where}.baseType: one of ${BASE_TYPES.join(", ")}`);
    if (variable?.cardinality !== undefined && !["single", "multiple", "ordered"].includes(variable.cardinality)) {
      problems.push(`${where}.cardinality: single, multiple or ordered`);
    }
  }
  return Object.keys(variables).length ? variables : undefined;
}

/**
 * The descriptor of a PCI project. `problems` lists what an authoring system could not use (an unknown editor, an
 * enum default that is not an option, a record field without a base type, a margin on a type it cannot measure, a
 * correct response on a tool); the build reports them as warnings. `errors` are tspci 2 keys that tspci 3 renamed;
 * they fail the build. `media` is the fixed media as the build resolved it
 * (resolveMedia in media.js): the files it puts next to the bundle go in `media`. `modules` are the libraries built into
 * modules of their own (resolveModules in rollup-plugin-modules.js), which go in `modules`.
 */
export function buildDescriptor(packageJson, config, media = [], modules = []) {
  const tspci = packageJson?.config?.tspci ?? {};
  const problems = [];
  if (!tspci.typeIdentifier) problems.push("package.json config.tspci.typeIdentifier is missing");

  const properties = {};
  for (const [key, entry] of Object.entries(config ?? {})) properties[key] = toProperty(key, entry, problems);

  const response = tspci.response ?? { cardinality: "single", baseType: "string" };
  checkResponse(response, problems, properties);
  const authoring = toAuthoring(tspci.authoring, properties, tspci.markup, problems);
  const templateVariables = checkTemplateVariables(tspci.templateVariables, problems);
  const errors = renamedKeys(tspci);
  for (const name of Object.keys(properties).filter((name) => RESERVED_PROPERTIES.includes(name))) {
    errors.push(
      `config.json ${name}: a player or authoring system sets data-${name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())} itself (the PCI authoring profile 3.4); give the setting another name`
    );
  }
  const { scoring, tool, correctResponse } = toScoring(tspci, problems);
  // a tool in some modes: { "<property>": ["value", ...] }, checked as `when` on a record field
  checkWhen("config.tspci.toolWhen", tspci.toolWhen, properties, problems);
  if (tspci.toolWhen !== undefined && tool) problems.push('config.tspci.toolWhen: the PCI is always a tool (scoring ["none"]), so it needs no toolWhen');
  const margins = [response.tolerance, ...Object.values(response.fields ?? {}).map((f) => f?.tolerance)].filter((t) => t !== undefined);
  if (tool && margins.length) problems.push("config.tspci.response: a tool is never scored, so a tolerance makes no sense");
  // a file cannot be compared with a correct response: only a person can score it
  const hasFile = response.baseType === "file" || Object.values(response.fields ?? {}).some((f) => f?.baseType === "file");
  if (hasFile && scoring.includes("match_correct")) {
    problems.push('config.tspci.scoring: a response with a file cannot be scored by match_correct; use "human"');
  }

  return {
    descriptor: {
      descriptorVersion: DESCRIPTOR_VERSION,
      typeIdentifier: tspci.typeIdentifier ?? "",
      version: packageJson?.version ?? "",
      label: tspci.label ?? packageJson?.name ?? "",
      properties,
      markup: tspci.markup ?? {},
      response,
      scoring,
      ...(tspci.toolWhen !== undefined && !tool ? { toolWhen: tspci.toolWhen } : {}),
      ...(correctResponse ? { correctResponse } : {}),
      ...(authoring ? { authoring } : {}),
      ...(templateVariables ? { templateVariables } : {}),
      ...(media.some((m) => m.mode === "file") ? { media: mediaDescriptor(media) } : {}),
      ...(modules.length ? { modules: modulesDescriptor(modules) } : {}),
    },
    problems,
    errors,
  };
}
