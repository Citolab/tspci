import procenten from "./assets/procenten.png"; // image types are bundled inside the js

/**
 * Represents an interactive analog clock Component.
 *
 * @param {Object} options - The options for the Interaction component.
 * @param {Object} options.config - The configuration object for the component.
 * @param {ShadowRoot} options.dom - A ShadowRoot element where you can add elements or listeners to.
 * @param {{ setState: (state:unknown)=>unknown, state:()=>unknown}} options.store - The store object for managing state.
 * @returns nothing
 */
export default function({ config, dom, store }) {
  dom.addEventListener("change", (e) => {
    const value = e.target.value;
    store.state = value;
  });

  return `<div class="pci-container">
  <h1>${config.properties.title}</h1>
  <div class="body">
    <img width="${+config.properties.width}" height="${+config.properties.height}" src="${procenten}" />
  </div>
  <div class="interaction">
    <label for="tentacles">${config.properties.prompt}</label>
    <input type="number" value="${store.state}" min="0" max="100">%
  </div>
</div>`;  
}