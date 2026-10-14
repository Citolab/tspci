import postcss from "postcss";
import loadPostCssConfig from "postcss-load-config";

/**
 * A PCI renders in a shadow root, and browsers ignore `@property` there, so Tailwind 4's registered `--tw-*` variables
 * lose both their initial value and `inherits: false`:
 * - without the initial value, `border` has no style (`--tw-border-style: solid`), `-translate-x-1/2` no y value and
 *   `ring`/`shadow` nothing: borders, shadows and rings silently disappear;
 * - without `inherits: false`, a variable set on a parent leaks into its children (`ring-inset` on a wrapper makes the
 *   rings inside it inset too).
 * This sets every `inherits: false` property on every element in the earliest layer (`properties`), which every
 * utility still overrides: to its initial value, or to `initial` (the guaranteed-invalid value, as if unset) when it has
 * none. That resets it per element instead of inheriting it. `inherits: true` properties inherit anyway and are left out.
 * CSS without `@property` is left as it is.
 */
export function shadowRootPropertyDefaults(root) {
  const defaults = [];
  root.walkAtRules("property", (rule) => {
    const name = rule.params.trim();
    let initial;
    let inherits;
    rule.walkDecls((decl) => {
      if (decl.prop === "initial-value") initial = decl.value;
      if (decl.prop === "inherits") inherits = decl.value.trim();
    });
    if (name.startsWith("--") && inherits === "false") {
      defaults.push(postcss.decl({ prop: name, value: initial ?? "initial" }));
    }
  });
  if (defaults.length === 0) {
    return root;
  }
  const rule = postcss.rule({ selectors: [":host", "*", "::before", "::after", "::backdrop"] });
  rule.append(defaults);
  root.append(postcss.atRule({ name: "layer", params: "properties", nodes: [rule] }));
  return root;
}

export function postcssString(options = {}) {
  const extensions = options.extensions || [".css"];
  const configEnabled = options.config !== false;
  const configCache = new Map();

  const loadConfig = async (cwd) => {
    if (configCache.has(cwd)) {
      return configCache.get(cwd);
    }

    let loaded = { plugins: [], options: {} };
    if (configEnabled) {
      try {
        const result = await loadPostCssConfig({}, cwd);
        loaded = {
          plugins: result?.plugins || [],
          options: result?.options || {},
        };
      } catch (error) {
        if (!String(error?.message || "").includes("No PostCSS Config found")) {
          throw error;
        }
      }
    }

    configCache.set(cwd, loaded);
    return loaded;
  };

  return {
    name: "postcss-string",
    async transform(code, id) {
      const shouldProcess = extensions.some((ext) => id.endsWith(ext));
      if (!shouldProcess) {
        return null;
      }

      const cwd = process.cwd();
      const { plugins, options: configOptions } = await loadConfig(cwd);
      const result = await postcss(plugins).process(code, {
        ...configOptions,
        from: id,
        to: id,
        map: false,
      });

      const css = shadowRootPropertyDefaults(result.root).toString();
      return {
        code: `export default ${JSON.stringify(css)};`,
        map: { mappings: "" },
      };
    },
  };
}
