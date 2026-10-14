// The host side of a PCI's authoring mode: the page an authoring system runs it in (see AUTHORING.md, "Authoring mode").
//
// The authoring system puts this page in an iframe, `srcdoc` and `sandbox="allow-scripts"` (no allow-same-origin: the
// PCI's code gets no access to the editor, its session or its API). Everything else goes by postMessage:
//   frame → host   pci-authoring:hello                     the page is listening
//   host → frame   pci-authoring:init { moduleUrl, typeIdentifier, properties, language }
//   frame → host   pci-authoring:ready | :change | :error { message }
//   host → frame   pci-authoring:request-config            the author pressed "Done"
//   frame → host   pci-authoring:config { config, problems }
// The PCI itself never posts messages: it only implements getAuthoringInstance (types: IMSpciAuthoringFactory).
// Every message carries `version` (AUTHORING_PROTOCOL_VERSION). It only goes up for a change the other side cannot
// handle; a new optional field keeps it. Each side checks the other's: the frame on init, the host on hello, and a
// mismatch is an error instead of a dialog that half works.
// Dependency-free on purpose, so an authoring system can copy or import it.

export const AUTHORING_MESSAGE_PREFIX = "pci-authoring:";
export const AUTHORING_PROTOCOL_VERSION = 1;

const escapeAttribute = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Runs inside the frame. Plain ES5, as the PCI bundles it loads.
const bootstrap = `(function () {
  var VERSION = ${AUTHORING_PROTOCOL_VERSION};
  var host = window.parent;
  var instance = null;
  var started = false;
  function post(message) { message.version = VERSION; host.postMessage(message, "*"); }
  function fail(error) { post({ type: "pci-authoring:error", message: String((error && error.message) || error) }); }
  window.addEventListener("error", function (event) { fail(event.message); });
  function start(init) {
    started = true;
    document.documentElement.lang = init.language || "en";
    define("qtiCustomInteractionContext", [], function () {
      return {
        register: function (factory) {
          if (!factory || typeof factory.getAuthoringInstance !== "function") {
            return fail("This PCI has no authoring mode (getAuthoringInstance).");
          }
          try {
            instance = factory.getAuthoringInstance(document.getElementById("pci"), {
              properties: init.properties || {},
              language: init.language,
              onready: function () { post({ type: "pci-authoring:ready" }); },
              onchange: function () { post({ type: "pci-authoring:change" }); }
            });
          } catch (error) { fail(error); }
        }
      };
    });
    requirejs.config({ paths: { pci: String(init.moduleUrl).replace(/\\.js$/, "") } });
    requirejs(["pci"], function () {}, fail);
  }
  window.addEventListener("message", function (event) {
    if (event.source !== host || !event.data) return;
    if (event.data.type === "pci-authoring:init" && !started) {
      if (event.data.version !== VERSION) return fail("Unsupported authoring protocol version " + event.data.version + " (this page speaks " + VERSION + ").");
      start(event.data);
    }
    else if (event.data.type === "pci-authoring:request-config") {
      if (!instance) return fail("The authoring mode is not ready.");
      try {
        var problems = typeof instance.validate === "function" ? instance.validate() || [] : [];
        post({ type: "pci-authoring:config", config: instance.getConfig(), problems: problems });
      } catch (error) { fail(error); }
    }
  });
  post({ type: "pci-authoring:hello" });
})();`;

/** The frame's HTML (for `iframe.srcdoc`). `requireJsUrl`: RequireJS, absolute (the frame has no origin of its own). */
export function authoringFrameHtml({ requireJsUrl }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>html, body { margin: 0; } #pci { padding: 16px; }</style>
    <script src="${escapeAttribute(requireJsUrl)}"></script>
  </head>
  <body>
    <div id="pci"></div>
    <script>${bootstrap}</script>
  </body>
</html>`;
}
