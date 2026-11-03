// `import { media } from "@citolab/tspci/media"`: the fixed media of the PCI, declared in package.json
// config.tspci.media. The build generates this module (src/rollup-plugin-media.js); see the readme, "Media".

/**
 * The URL of the fixed media file `name`: a data URL when it is in the bundle, otherwise the file the authoring system
 * placed in the item's markup or the one next to the module. Pass the dom of getInstance and call it before you render
 * into the dom, as a render may remove the markup's elements.
 */
export declare function media(name: string, dom?: Element | null): string;

/** The attribute an authoring system gives the elements of fixed media in qti-interaction-markup. */
export declare const MEDIA_ATTRIBUTE: "data-pci-media";

/**
 * The element an authoring system put in qti-interaction-markup for the markup slot `name` (config.tspci.markup), such
 * as the video the author chose: `<video data-pci-slot="video" src="...">`, or null. Call it before you render.
 */
export declare function slot(name: string, dom?: Element | null): HTMLElement | null;

/** The attribute an authoring system gives the element of a markup slot in qti-interaction-markup. */
export declare const SLOT_ATTRIBUTE: "data-pci-slot";
