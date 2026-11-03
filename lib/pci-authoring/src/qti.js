// A QTI 3 item and package for a PCI with an authoring descriptor (authoring.json), written as the PCI Authoring
// Profile says an authoring system writes them (docs/spec/README.md, sections 5 and 6): the properties as data-
// attributes, the author's files in the markup slots, the PCI's fixed media and further modules, and the scoring.

/** Where a package keeps the PCI's files, the item and the author's files. */
export const PACKAGE_PCI_FOLDER = "resources/pci/";
export const PACKAGE_ITEM_PATH = "items/ITM-PCI.xml";
export const PACKAGE_MEDIA_FOLDER = "items/media/";

const NAMESPACES =
  'xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"';

export const escapeXml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The data- attribute of a property: `gridDivisions` → `data-grid-divisions` (the reverse of element.dataset). */
export const dataAttribute = (name) => `data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** A path relative to the PCI's module that stays inside its folder: no scheme, no leading /, no .. segment. */
const isRelative = (file) =>
  typeof file === "string" && file !== "" && !/^[a-z][a-z0-9+.-]*:/i.test(file) && !file.startsWith("/") && !file.split("/").includes("..");

/** A file name that is the same in a URL, a zip and XML: letters, digits, `.`, `-` and `_`. */
export const fileName = (name) =>
  String(name).split(/[/\\]/).pop().replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "media";

/**
 * The files an item needs next to the PCI's module, relative to it: the module, the descriptor, the fixed media
 * (`media`) and the further modules (`modules.paths`). A path that would leave the module's folder is left out.
 */
export function pciFiles(descriptor, { module = "index.js" } = {}) {
  const media = Object.values(descriptor?.media ?? {}).map((m) => m?.file);
  const modules = Object.values(descriptor?.modules?.paths ?? {}).map((p) => (typeof p === "string" ? `${p}.js` : p));
  return [...new Set([module, "authoring.json", ...media, ...modules].filter(isRelative))];
}

/** The element of a markup slot: its `element`, else what its `accept` asks for, else img. */
export function slotElement(slot) {
  if (slot?.element) return slot.element;
  const kinds = (slot?.accept ?? []).map((type) => type.split("/")[0]);
  return kinds.find((kind) => kind === "video" || kind === "audio") ?? "img";
}

/** A text of the descriptor in `language`, else any, else `fallback`. */
export function localized(text, language, fallback = "") {
  if (typeof text === "string") return text;
  if (!text || typeof text !== "object") return fallback;
  return text[language] ?? text[String(language).split("-")[0]] ?? text.en ?? Object.values(text)[0] ?? fallback;
}

/**
 * What keeps an item from being written as the author set it up, one message each for the author: a required markup
 * slot without a file, a required property without a value, an enum value that is not one of its options, a number that
 * is not one or outside min/max. An empty list when the item can be written. `slots` are the slots that have a file
 * (any truthy value per slot name); a property that is not given has its default.
 */
export function itemProblems(descriptor, { properties = {}, slots = {}, language = "en" } = {}) {
  const problems = [];
  for (const [name, slot] of Object.entries(descriptor?.markup ?? {})) {
    if ((slot?.editor ?? "media") === "media" && slot?.required && !slots[name]) {
      problems.push({ field: `markup.${name}`, message: `${localized(slot.label, language, name)}: choose a file first` });
    }
  }
  for (const [name, spec] of Object.entries(descriptor?.properties ?? {})) {
    const label = localized(spec?.label, language, name);
    const value = String(properties[name] ?? spec?.default ?? "");
    const field = `properties.${name}`;
    if (value.trim() === "") {
      if (spec?.required) problems.push({ field, message: `${label}: fill this in first` });
      continue;
    }
    if (spec?.editor === "enum" && Array.isArray(spec.options) && !spec.options.some((o) => String(o?.value) === value)) {
      problems.push({ field, message: `${label}: "${value}" is not one of the options` });
    }
    if (spec?.editor === "integer" || spec?.editor === "number") {
      const n = Number(value);
      if (!Number.isFinite(n) || (spec.editor === "integer" && !Number.isInteger(n))) {
        problems.push({ field, message: `${label}: "${value}" is not ${spec.editor === "integer" ? "a whole number" : "a number"}` });
      } else if (typeof spec.min === "number" && n < spec.min) {
        problems.push({ field, message: `${label}: at least ${spec.min}` });
      } else if (typeof spec.max === "number" && n > spec.max) {
        problems.push({ field, message: `${label}: at most ${spec.max}` });
      }
    }
  }
  return problems;
}

function mediaElementXml(element, attributes, src, alt) {
  if (element === "img") return `<img ${attributes} src="${escapeXml(src)}" alt="${escapeXml(alt)}"/>`;
  if (element === "object") return `<object ${attributes} data="${escapeXml(src)}"></object>`;
  return `<${element} ${attributes} src="${escapeXml(src)}"></${element}>`;
}

function responseDeclaration(response, correct) {
  const cardinality = response?.cardinality ?? "single";
  if (cardinality === "record") return `<qti-response-declaration identifier="RESPONSE" cardinality="record"></qti-response-declaration>`;
  const values = correct === undefined ? [] : Array.isArray(correct) ? correct : [correct];
  const correctXml = values.length
    ? `<qti-correct-response>${values.map((v) => `<qti-value>${escapeXml(v)}</qti-value>`).join("")}</qti-correct-response>`
    : "";
  return `<qti-response-declaration identifier="RESPONSE" cardinality="${cardinality}" base-type="${escapeXml(response?.baseType ?? "string")}">${correctXml}</qti-response-declaration>`;
}

/** The match_correct template written out, so scoring does not depend on fetching the template. */
const MATCH_CORRECT = `<qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match><qti-variable identifier="RESPONSE"></qti-variable><qti-correct identifier="RESPONSE"></qti-correct></qti-match>
        <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">1</qti-base-value></qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">0</qti-base-value></qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>`;

/**
 * The scoring an item gets: the one asked for when the descriptor offers it, else the descriptor's default (the first
 * of `scoring`). `match_correct` on a record falls back to `human`: QTI's match cannot compare records field by field
 * without rules from the author.
 */
export function itemScoring(descriptor, asked) {
  const offered = Array.isArray(descriptor?.scoring) && descriptor.scoring.length ? descriptor.scoring : ["match_correct"];
  const scoring = offered.includes(asked) ? asked : offered[0];
  return scoring === "match_correct" && descriptor?.response?.cardinality === "record" ? "human" : scoring;
}

/**
 * The QTI 3 item with this PCI.
 *
 * - `properties`: the properties as strings (missing ones get their default from the descriptor), one data- attribute each
 * - `resolve(file)`: the href in the item of a file next to the PCI's module (`index.js`, `media/intro.mp4`)
 * - `slots`: the author's file per markup slot, `{ video: { src, alt? } }`, src as the item refers to it
 * - `correct`: the correct response (single, multiple or ordered), as QTI values
 * - `scoring`: one of the descriptor's `scoring` (its first by default)
 * - `interactionAttributes`: more attributes on qti-portable-custom-interaction (a player's own, such as data-base-url)
 * - `standalone`: false for an item inside a page (no XML declaration and namespaces)
 */
export function itemXml(descriptor, options = {}) {
  const {
    properties = {},
    language = "en",
    resolve = (file) => file,
    module = "index.js",
    slots = {},
    correct,
    scoring: asked,
    identifier = "ITM-PCI",
    title,
    interactionAttributes = {},
    standalone = true,
  } = options;
  const label = typeof descriptor.label === "string" ? descriptor.label : descriptor.label?.[language] ?? Object.values(descriptor.label ?? {})[0];
  const defaults = Object.fromEntries(Object.entries(descriptor.properties ?? {}).map(([name, p]) => [name, p?.default ?? ""]));
  const data = Object.entries({ ...defaults, ...properties })
    .map(([name, value]) => ` ${dataAttribute(name)}="${escapeXml(value)}"`)
    .join("");
  const extra = Object.entries(interactionAttributes)
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join("");
  const withoutJs = (href) => href.replace(/\.js$/, "");

  const modules = [
    `<qti-interaction-module id="pci" primary-path="${escapeXml(withoutJs(resolve(module)))}"></qti-interaction-module>`,
    ...Object.entries(descriptor.modules?.paths ?? {})
      .filter(([, path]) => isRelative(path))
      .map(([id, path]) => `<qti-interaction-module id="${escapeXml(id)}" primary-path="${escapeXml(withoutJs(resolve(`${path}.js`)))}"></qti-interaction-module>`),
  ];

  // 5.1 the author's files, marked with their slot; 5.2 then the PCI's own media, hidden
  const slotMarkup = Object.entries(descriptor.markup ?? {})
    .filter(([name, slot]) => (slot?.editor ?? "media") === "media" && slots[name]?.src)
    .map(([name, slot]) => {
      const { src, alt } = slots[name];
      const fallbackAlt = fileName(src).replace(/\.[^.]*$/, "").replace(/[-_]+/g, " ");
      return mediaElementXml(slotElement(slot), `data-pci-slot="${escapeXml(name)}"`, src, alt ?? fallbackAlt);
    });
  const fixedMarkup = Object.entries(descriptor.media ?? {})
    .filter(([, m]) => isRelative(m?.file))
    .map(([name, m]) => {
      const attributes = `data-pci-media="${escapeXml(name)}" class="qti-hidden"`;
      const element = m.element === "audio" || m.element === "video" ? m.element : m.element === "img" ? "img" : "object";
      return element === "audio" || element === "video"
        ? `<${element} ${attributes} src="${escapeXml(resolve(m.file))}" preload="none"></${element}>`
        : mediaElementXml(element, attributes, resolve(m.file), "");
    });

  const scoring = itemScoring(descriptor, asked);
  const externalScored = scoring === "human" ? ' external-scored="human"' : "";
  return `${standalone ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ""}<qti-assessment-item ${standalone ? `${NAMESPACES} ` : ""}identifier="${escapeXml(identifier)}" title="${escapeXml(title ?? label ?? descriptor.typeIdentifier)}" adaptive="false" time-dependent="false" xml:lang="${escapeXml(language)}">
  ${responseDeclaration(descriptor.response, correct)}
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"${externalScored}><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-portable-custom-interaction response-identifier="RESPONSE" module="pci" custom-interaction-type-identifier="${escapeXml(descriptor.typeIdentifier)}"${extra}${data}>
      <qti-interaction-modules>
        ${modules.join("\n        ")}
      </qti-interaction-modules>
      <qti-interaction-markup>${[...slotMarkup, ...fixedMarkup].join("")}</qti-interaction-markup>
    </qti-portable-custom-interaction>
  </qti-item-body>
  ${scoring === "match_correct" ? MATCH_CORRECT : ""}
</qti-assessment-item>
`;
}

const manifestXml = (pciFileNames, mediaNames) => `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd"
  identifier="QTI3-PACKAGE-1">
  <metadata>
    <schema>QTI Package</schema>
    <schemaversion>3.0.0</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="RES-ITEM" type="imsqti_item_xmlv3p0" href="${PACKAGE_ITEM_PATH}">
      <file href="${PACKAGE_ITEM_PATH}"/>
${mediaNames.map((name) => `      <file href="${escapeXml(PACKAGE_MEDIA_FOLDER + name)}"/>\n`).join("")}      <dependency identifierref="RES-PCI"/>
    </resource>
    <resource identifier="RES-TEST" type="imsqti_test_xmlv3p0" href="assessmentTest.xml">
      <file href="assessmentTest.xml"/>
      <dependency identifierref="RES-ITEM"/>
    </resource>
    <resource identifier="RES-PCI" type="webcontent" href="${PACKAGE_PCI_FOLDER}${escapeXml(pciFileNames[0])}">
${pciFileNames.map((name) => `      <file href="${escapeXml(PACKAGE_PCI_FOLDER + name)}"/>`).join("\n")}
    </resource>
  </resources>
</manifest>
`;

const testXml = (title, language) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
  identifier="TST-PCI" title="${escapeXml(title)}" xml:lang="${escapeXml(language)}">
  <qti-test-part identifier="TP-1" navigation-mode="nonlinear" submission-mode="individual">
    <qti-assessment-section identifier="S-1" title="Section 1" visible="true">
      <qti-assessment-item-ref identifier="ITEMREF-1" href="${PACKAGE_ITEM_PATH}"/>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>
`;

/**
 * The files of a QTI 3 package (path → bytes or text) with one item with this PCI and a test around it; zip them with
 * `zip()`.
 *
 * - `files`: the PCI's files by their path relative to its module (`pciFiles()`, plus any others to ship, such as the
 *   SBOM); the module comes first in the PCI resource
 * - `slots`: the author's file per markup slot, `{ video: { name: "bunny.mp4", data } }`; it goes in items/media/
 * - the rest are the options of `itemXml` (properties, language, correct, scoring)
 */
export function qtiPackage(descriptor, { files, slots = {}, module = "index.js", ...item }) {
  if (!files?.[module]) throw new Error(`qtiPackage: the PCI's module ${module} is not in files`);
  const pci = [module, ...Object.keys(files).filter((f) => f !== module && isRelative(f))];
  const media = {};
  const itemSlots = {};
  for (const [slot, file] of Object.entries(slots)) {
    if (!file?.data) continue;
    const name = fileName(file.name ?? slot);
    media[name] = file.data;
    itemSlots[slot] = { src: `media/${name}`, alt: file.alt };
  }
  const language = item.language ?? "en";
  const xml = itemXml(descriptor, { ...item, module, slots: itemSlots, resolve: (file) => `../${PACKAGE_PCI_FOLDER}${file}` });
  const title = item.title ?? (typeof descriptor.label === "string" ? descriptor.label : descriptor.typeIdentifier);
  const out = {
    "imsmanifest.xml": manifestXml(pci, Object.keys(media)),
    "assessmentTest.xml": testXml(title, language),
    [PACKAGE_ITEM_PATH]: xml,
  };
  for (const [name, data] of Object.entries(media)) out[PACKAGE_MEDIA_FOLDER + name] = data;
  for (const file of pci) out[PACKAGE_PCI_FOLDER + file] = files[file];
  return out;
}
