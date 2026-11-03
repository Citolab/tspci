// Plain ES2015, as it goes into the bundle untranspiled.
//
// The runtime of `import { media } from "@citolab/tspci/media"`: the URL of a fixed media file of the PCI (one declared
// in config.tspci.media, see rollup-plugin-media.js), the same call whether the build put it in the bundle or next to it.
//
//   inline   the data URL the build wrote into the bundle
//   file     1. the element the authoring system put in qti-interaction-markup: <video data-pci-media="intro" src>
//               (it rewrites the src with the item's media, so every QTI player resolves it)
//            2. else the file next to the module: dist/media/intro.mp4, which a package ships along with index.js
//               (TAO lists it in runtime.mediaFiles); the module's URL comes from the script tag that loaded it (the
//               banner of the bundle), or from RequireJS (TAO registers the typeIdentifier as a path)

export const MEDIA_ATTRIBUTE = "data-pci-media";
export const SLOT_ATTRIBUTE = "data-pci-slot";
export const MODULE_URLS = "__tspciModuleUrls";

/**
 * The element an authoring system put in qti-interaction-markup for the markup slot `name` (config.tspci.markup):
 * `<video data-pci-slot="video" src>`, or null. Call it before you render into the dom.
 */
export function slot(name, dom) {
  if (!dom || typeof dom.querySelectorAll !== "function") return null;
  const all = dom.querySelectorAll(`[${SLOT_ATTRIBUTE}]`);
  for (let i = 0; i < all.length; i++) if (all[i].getAttribute(SLOT_ATTRIBUTE) === name) return all[i];
  return null;
}

export function createMedia(table, { key, typeIdentifier }) {
  const found = new WeakMap();

  const fromMarkup = (dom, name) => {
    if (!dom || typeof dom.querySelectorAll !== "function") return null;
    let elements = found.get(dom);
    if (!elements) {
      elements = {};
      const all = dom.querySelectorAll(`[${MEDIA_ATTRIBUTE}]`);
      for (let i = 0; i < all.length; i++) {
        const element = all[i];
        const name = element.getAttribute(MEDIA_ATTRIBUTE);
        if (!elements[name]) elements[name] = element;
      }
      found.set(dom, elements);
    }
    const element = elements[name];
    if (!element) return null;
    // the property is the URL the browser resolved; the attribute when the element has no such property (a <source>
    // outside a document, an <object>)
    return element.src || element.data || element.getAttribute("src") || element.getAttribute("data") || element.getAttribute("href");
  };

  const fromModule = (file) => {
    const urls = typeof window !== "undefined" ? window[MODULE_URLS] : null;
    const moduleUrl = urls && urls[key];
    if (moduleUrl) return new URL(file, moduleUrl).href;
    const amdRequire = typeof window !== "undefined" ? window.require : null;
    if (amdRequire && typeof amdRequire.toUrl === "function" && typeIdentifier) {
      // the dist folder is the folder of the module; TAO keeps that layout under interaction/runtime/js
      return amdRequire.toUrl(`${typeIdentifier}/interaction/runtime/js/${file}`);
    }
    return null;
  };

  /**
   * The URL of the media file `name` (config.tspci.media). Pass the dom of getInstance, so the file can come from the
   * item's markup, and call it before you render into the dom (a render may remove the markup's elements).
   */
  return function media(name, dom) {
    const entry = table[name];
    if (!entry) {
      console.error(`tspci media: "${name}" is not in config.tspci.media (${Object.keys(table).join(", ") || "none declared"})`);
      return "";
    }
    if (entry.inline) return entry.inline;
    const url = fromMarkup(dom, name) || fromModule(entry.file);
    if (!url) console.error(`tspci media: cannot find "${name}" (${entry.file}) in the markup or next to the module`);
    return url || "";
  };
}
