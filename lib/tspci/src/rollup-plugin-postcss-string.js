import postcss from "postcss";
import loadPostCssConfig from "postcss-load-config";

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

      return {
        code: `export default ${JSON.stringify(result.css)};`,
        map: { mappings: "" },
      };
    },
  };
}
