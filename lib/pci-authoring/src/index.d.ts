// @citolab/pci-authoring: items and packages for a PCI of the PCI Authoring Profile (docs/spec/README.md).

/** A text in one language, or per BCP 47 language tag. */
export type AuthoringText = string | Record<string, string>;

/** authoring.json, the descriptor of the PCI Authoring Profile 1.0 (docs/spec/authoring.schema.json). */
export interface AuthoringDescriptor {
  descriptorVersion: "1.0";
  typeIdentifier: string;
  version?: string;
  label?: AuthoringText;
  properties: Record<string, { editor: string; default: string; label?: AuthoringText; [hint: string]: unknown }>;
  response:
    | { cardinality: "single" | "multiple" | "ordered"; baseType: string; tolerance?: "range" | "area" }
    | {
        cardinality: "record";
        fields: Record<string, { baseType: string; tolerance?: "range" | "area"; label?: AuthoringText; when?: Record<string, string[]> }>;
      };
  scoring: Scoring[];
  correctResponse?: "properties";
  markup?: Record<string, MarkupSlot>;
  media?: Record<string, { file: string; type: string; element: "img" | "audio" | "video" | "object"; size?: number }>;
  modules?: { paths: Record<string, string> };
  authoring?: { properties: string[]; markup?: string[]; label?: AuthoringText; width?: number; height?: number };
  templateVariables?: Record<string, { baseType: string; cardinality?: "single" | "multiple" | "ordered"; label?: AuthoringText; hint?: AuthoringText; required?: boolean }>;
}

export type Scoring = "match_correct" | "custom" | "human" | "none";

export interface MarkupSlot {
  editor?: string;
  element?: "img" | "audio" | "video" | "object";
  accept?: string[];
  required?: boolean;
  label?: AuthoringText;
}

export interface ItemOptions {
  /** The properties as strings; missing ones get their default from the descriptor. One data- attribute each. */
  properties?: Record<string, string>;
  /** xml:lang of the item. */
  language?: string;
  /** The href in the item of a file next to the PCI's module ("index.js", "media/intro.mp4"). */
  resolve?: (file: string) => string;
  /** The PCI's module, relative to its folder. */
  module?: string;
  /** The author's file per markup slot, src as the item refers to it. */
  slots?: Record<string, { src: string; alt?: string }>;
  /** The correct response as QTI values: one (single), several (multiple, ordered), or per field (record). */
  correct?: string | string[] | Record<string, string>;
  /** For a single response with `tolerance`: ± a number or { min, max } (range), or a radius (area). */
  margin?: Margin;
  /** Per record field with `tolerance`, as `margin`. */
  margins?: Record<string, Margin>;
  /** A value (or list) per template variable of the descriptor; each one given is declared and bound in the item. */
  templateValues?: Record<string, string | string[]>;
  /** One of the descriptor's scoring; its first by default. */
  scoring?: Scoring;
  identifier?: string;
  title?: string;
  /** The label attribute of the qti-assessment-item. */
  label?: string;
  /** More attributes on qti-portable-custom-interaction, such as a player's data-base-url. */
  interactionAttributes?: Record<string, string>;
  /** false for an item inside a page: no XML declaration and namespaces. */
  standalone?: boolean;
}

/** A range: ± a number around the correct value, or { min, max }. An area: a radius around the correct point. */
export type Margin = number | { min: number; max: number };

export type FileData = Uint8Array | string;

export interface PackageOptions extends Omit<ItemOptions, "resolve" | "slots" | "standalone"> {
  /** The PCI's files by their path relative to its module: at least the module (see pciFiles). */
  files: Record<string, FileData>;
  /** The author's file per markup slot; it goes in items/media/. */
  slots?: Record<string, { name: string; data: FileData; alt?: string }>;
  /** Other files of the item, by their path in the package ("assets/logo.png"), listed with the item. */
  itemFiles?: Record<string, FileData>;
}

export declare const PACKAGE_PCI_FOLDER: "resources/pci/";
export declare const PACKAGE_ITEM_PATH: "items/ITM-PCI.xml";
export declare const PACKAGE_MEDIA_FOLDER: "items/media/";

/** The files an item needs next to the PCI's module: the module, authoring.json, fixed media, further modules. */
export declare function pciFiles(descriptor: AuthoringDescriptor, options?: { module?: string }): string[];
/** The QTI 3 item with this PCI, as the profile says an authoring system writes it. */
export declare function itemXml(descriptor: AuthoringDescriptor, options?: ItemOptions): string;
/** The files of a QTI 3 package with one item with this PCI; zip them with zip(). */
export declare function qtiPackage(descriptor: AuthoringDescriptor, options: PackageOptions): Record<string, FileData>;
/** A zip (stored, no compression) of path → bytes or text. */
export declare function zip(files: Record<string, FileData>): Uint8Array;
/** What keeps an item from being written as set up, one message each for the author. */
export interface ItemProblem {
  /** `markup.<slot>` or `properties.<name>`. */
  field: string;
  message: string;
}
/**
 * A required slot without a file, a required property without a value, an enum value not in its options, a number
 * that is not one or outside min/max; empty when the item can be written. `slots`: the slots that have a file.
 */
export declare function itemProblems(
  descriptor: AuthoringDescriptor,
  options?: { properties?: Record<string, string>; slots?: Record<string, unknown>; templateValues?: Record<string, unknown>; language?: string }
): ItemProblem[];
/** A text of the descriptor in `language`, else any, else `fallback`. */
export declare function localized(text: AuthoringText | undefined, language: string, fallback?: string): string;
/** What getResponse() reports (QTI Appendix C JSON) as correct-response values: one, a list, or per record field. */
export declare function correctFromResponse(response: unknown): string | string[] | Record<string, string> | undefined;
/** The record fields that are part of the response for these properties (`when`). */
export declare function appliedFields(descriptor: AuthoringDescriptor, properties?: Record<string, string>): string[];
/** The scoring an item gets for `asked`: offered by the descriptor, else its first. */
export declare function itemScoring(descriptor: AuthoringDescriptor, asked?: Scoring): Scoring;
/** The element of a markup slot: its element, else what accept asks for, else img. */
export declare function slotElement(slot: MarkupSlot): "img" | "audio" | "video" | "object";
/** `gridDivisions` → `data-grid-divisions`. */
export declare function dataAttribute(name: string): string;
/** A file name safe in a URL, a zip and XML. */
export declare function fileName(name: string): string;
export declare function escapeXml(value: string): string;
