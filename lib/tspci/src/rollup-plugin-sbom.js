import chalk from "chalk";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Generates a CycloneDX 1.6 SBOM from the modules that actually ended up in the
// bundle. This is deliberately based on the rollup module graph and not on
// package.json: a PCI ships as a single inlined UMD file, so a dependency-tree
// based SBOM would list build-time packages (rollup, typescript, tailwind, ...)
// that are never delivered, while missing what got inlined.
//
// See readme.md ("SBOM") for the configuration options and known limitations.

const NODE_MODULES_SEGMENT = `${path.sep}node_modules${path.sep}`;
const DEFAULT_FILE_NAME = "sbom.cdx.json";
const SPDX_ID_PATTERN = /^[A-Za-z0-9-.+]+$/;
const VENDORED_PATTERNS = [/[\\/]vendors?[\\/]/i, /[\\/]vendored[\\/]/i, /[\\/](?:3rd|third)[-_]?party[\\/]/i, /\.min\.[cm]?js$/i];
const REMOTE_SCRIPT_PATTERN = /https?:\/\/[^\s"'`)]+?\.[cm]?js\b/g;

const toPosix = (value) => value.split(path.sep).join("/");

const readJsonSafe = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

// Resolve the owning package directory of a module inside node_modules by
// taking one path segment after the last node_modules (two for scoped
// packages). Walking up to the nearest package.json is unreliable there:
// many packages ship sub-folder package.json files with only "main"/"module".
const resolveNodeModulesPackageDir = (modulePath) => {
  const index = modulePath.lastIndexOf(NODE_MODULES_SEGMENT);
  if (index === -1) {
    return null;
  }
  const base = modulePath.slice(0, index + NODE_MODULES_SEGMENT.length);
  const parts = modulePath
    .slice(index + NODE_MODULES_SEGMENT.length)
    .split(path.sep)
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const segments = parts[0].startsWith("@") ? 2 : 1;
  if (parts.length < segments) {
    return null;
  }
  return path.join(base, ...parts.slice(0, segments));
};

// Fallback for modules outside node_modules: linked workspace packages resolve
// to their real path, so walk up until a package.json shows up.
const resolveLinkedPackageDir = (modulePath, projectRoot) => {
  let dir = path.dirname(modulePath);
  for (;;) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === projectRoot) {
      return null;
    }
    dir = parent;
  }
};

const purlFor = (name, version) => {
  const encodedName = name.startsWith("@")
    ? `${encodeURIComponent(name.slice(0, name.indexOf("/")))}/${name.slice(name.indexOf("/") + 1)}`
    : name;
  return version ? `pkg:npm/${encodedName}@${version}` : `pkg:npm/${encodedName}`;
};

const licensesFor = (packageJson) => {
  const raw = packageJson.license || packageJson.licenses;
  const values = Array.isArray(raw)
    ? raw.map((entry) => (typeof entry === "string" ? entry : entry?.type)).filter(Boolean)
    : [typeof raw === "string" ? raw : raw?.type].filter(Boolean);
  if (values.length === 0) {
    return null;
  }
  return values.map((value) =>
    SPDX_ID_PATTERN.test(value) ? { license: { id: value } } : { expression: value }
  );
};

// package.json repository values are often shorthand ("preactjs/preact",
// "github:preactjs/preact"), which is not a usable url in an SBOM.
const normalizeRepositoryUrl = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const shorthand = value.match(/^(?:(github|gitlab|bitbucket):)?([\w.-]+\/[\w.-]+)$/);
  if (shorthand) {
    const host = { gitlab: "gitlab.com", bitbucket: "bitbucket.org" }[shorthand[1]] || "github.com";
    return `https://${host}/${shorthand[2]}`;
  }
  return value;
};

const externalReferencesFor = (packageJson, lockEntry) => {
  const references = [];
  const repositoryUrl = normalizeRepositoryUrl(
    typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url
  );
  if (repositoryUrl) {
    references.push({ type: "vcs", url: repositoryUrl });
  }
  if (packageJson.homepage) {
    references.push({ type: "website", url: packageJson.homepage });
  }
  if (lockEntry?.resolved) {
    references.push({ type: "distribution", url: lockEntry.resolved });
  }
  return references.length > 0 ? references : null;
};

// npm records integrity as "<alg>-<base64>", CycloneDX expects hex.
const hashesFromIntegrity = (integrity) => {
  if (typeof integrity !== "string") {
    return null;
  }
  const hashes = [];
  for (const entry of integrity.split(/\s+/).filter(Boolean)) {
    const separator = entry.indexOf("-");
    if (separator === -1) {
      continue;
    }
    const algorithm = entry.slice(0, separator).toLowerCase();
    const alg = { sha512: "SHA-512", sha384: "SHA-384", sha256: "SHA-256", sha1: "SHA-1" }[algorithm];
    if (!alg) {
      continue;
    }
    const content = Buffer.from(entry.slice(separator + 1), "base64").toString("hex");
    hashes.push({ alg, content });
  }
  return hashes.length > 0 ? hashes : null;
};

const loadLockPackages = (projectRoot) => {
  const lock = readJsonSafe(path.join(projectRoot, "package-lock.json"));
  return lock?.packages && typeof lock.packages === "object" ? lock.packages : {};
};

// Deterministic serial number: a rebuild of the same sources gives the same
// document, so an SBOM in version control does not produce diff noise.
const serialNumberFor = (seed) => {
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  return `urn:uuid:${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(
    16,
    20
  )}-${digest.slice(20, 32)}`;
};

const normalizeAdditionalComponent = (component) => {
  if (!component || typeof component !== "object" || !component.name) {
    return null;
  }
  const licenses =
    component.licenses ||
    (component.license
      ? SPDX_ID_PATTERN.test(component.license)
        ? [{ license: { id: component.license } }]
        : [{ expression: component.license }]
      : null);
  const normalized = {
    type: component.type || "library",
    "bom-ref": component["bom-ref"] || component.purl || purlFor(component.name, component.version),
    name: component.name,
    ...(component.version ? { version: component.version } : {}),
    ...(component.description ? { description: component.description } : {}),
    ...(component.purl ? { purl: component.purl } : {}),
    ...(licenses ? { licenses } : {}),
    ...(component.hashes ? { hashes: component.hashes } : {}),
    ...(component.externalReferences ? { externalReferences: component.externalReferences } : {}),
  };
  const declaredManually = { name: "tspci:origin", value: "declared-manually" };
  normalized.properties = [...(component.properties || []), declaredManually];
  return normalized;
};

const supplierFrom = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return { name: value };
  }
  const name = value.name;
  if (!name) {
    return null;
  }
  return {
    name,
    ...(value.url ? { url: Array.isArray(value.url) ? value.url : [value.url] } : {}),
    ...(value.contact ? { contact: Array.isArray(value.contact) ? value.contact : [value.contact] } : {}),
  };
};

export function sbom(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const cliPackageJson = options.cliPackageJson || null;

  return {
    name: "sbom",
    writeBundle(outputOptions, bundle) {
      const projectPackageJson = readJsonSafe(path.join(projectRoot, "package.json"));
      if (!projectPackageJson) {
        warn("cannot read package.json, skipping SBOM generation");
        return;
      }
      const settings = projectPackageJson.config?.tspci?.sbom || {};
      // an SBOM is generated for every production build, --no-sbom opts out
      if (settings.enabled === false || process.argv.includes("--no-sbom")) {
        return;
      }

      const outputDir = outputOptions.dir
        ? path.resolve(projectRoot, outputOptions.dir)
        : path.dirname(path.resolve(projectRoot, outputOptions.file));

      // Collect the modules that contributed code to the output.
      const includedModules = new Set();
      const entryChunks = [];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") {
          continue;
        }
        if (chunk.isEntry) {
          entryChunks.push(chunk);
        }
        for (const [moduleId, moduleInfo] of Object.entries(chunk.modules || {})) {
          if ((moduleInfo?.renderedLength ?? 0) > 0) {
            includedModules.add(moduleId);
          }
        }
      }

      const packages = new Map(); // package dir -> { packageJson, packageDir }
      const moduleOwner = new Map(); // module id -> bom-ref
      const projectModules = [];
      const unknownModules = [];
      const lockPackages = loadLockPackages(projectRoot);

      const rootRef = purlFor(
        projectPackageJson.name || "pci",
        projectPackageJson.version || "0.0.0"
      );

      for (const moduleId of includedModules) {
        if (!path.isAbsolute(moduleId) || !fs.existsSync(moduleId)) {
          continue; // virtual modules and plugin helpers, no upstream component
        }
        const packageDir = moduleId.includes(NODE_MODULES_SEGMENT)
          ? resolveNodeModulesPackageDir(moduleId)
          : resolveLinkedPackageDir(moduleId, projectRoot);

        if (!packageDir || packageDir === projectRoot) {
          moduleOwner.set(moduleId, rootRef);
          projectModules.push(moduleId);
          continue;
        }
        let entry = packages.get(packageDir);
        if (!entry) {
          const packageJson = readJsonSafe(path.join(packageDir, "package.json"));
          if (!packageJson?.name) {
            moduleOwner.set(moduleId, rootRef);
            unknownModules.push(moduleId);
            continue;
          }
          entry = { packageJson, packageDir };
          packages.set(packageDir, entry);
        }
        moduleOwner.set(moduleId, purlFor(entry.packageJson.name, entry.packageJson.version));
      }

      const components = [];
      const seenRefs = new Set();
      for (const { packageJson, packageDir } of [...packages.values()].sort((a, b) =>
        a.packageJson.name.localeCompare(b.packageJson.name)
      )) {
        // the same name and version can be installed in more than one place,
        // a bom-ref has to stay unique
        const ref = purlFor(packageJson.name, packageJson.version);
        if (seenRefs.has(ref)) {
          continue;
        }
        seenRefs.add(ref);
        const lockKey = toPosix(path.relative(projectRoot, packageDir));
        const lockEntry = lockPackages[lockKey] || null;
        const licenses = licensesFor(packageJson);
        const references = externalReferencesFor(packageJson, lockEntry);
        const hashes = hashesFromIntegrity(lockEntry?.integrity);
        components.push({
          type: "library",
          "bom-ref": ref,
          name: packageJson.name,
          ...(packageJson.version ? { version: packageJson.version } : {}),
          ...(packageJson.description ? { description: packageJson.description } : {}),
          purl: ref,
          ...(licenses ? { licenses } : {}),
          ...(hashes ? { hashes } : {}),
          ...(references ? { externalReferences: references } : {}),
          properties: [
            { name: "tspci:origin", value: lockKey.startsWith("node_modules/") ? "bundled" : "bundled-linked" },
          ],
        });
      }

      for (const additional of settings.additionalComponents || []) {
        const normalized = normalizeAdditionalComponent(additional);
        if (normalized) {
          components.push(normalized);
        } else {
          warn("ignoring an entry in config.tspci.sbom.additionalComponents without a name");
        }
      }

      // Package level dependency graph, derived from the module level imports.
      const edges = new Map([[rootRef, new Set()]]);
      for (const ref of components.map((component) => component["bom-ref"])) {
        if (!edges.has(ref)) {
          edges.set(ref, new Set());
        }
      }
      for (const moduleId of includedModules) {
        const from = moduleOwner.get(moduleId);
        if (!from) {
          continue;
        }
        const moduleInfo = this.getModuleInfo(moduleId);
        const imported = [
          ...(moduleInfo?.importedIds || []),
          ...(moduleInfo?.dynamicallyImportedIds || []),
        ];
        for (const importedId of imported) {
          const to = moduleOwner.get(importedId);
          if (to && to !== from && edges.has(from)) {
            edges.get(from).add(to);
          }
        }
      }
      const dependencies = [...edges.entries()]
        .map(([ref, dependsOn]) => ({ ref, dependsOn: [...dependsOn].sort() }))
        .sort((a, b) => (a.ref === rootRef ? -1 : b.ref === rootRef ? 1 : a.ref.localeCompare(b.ref)));

      // Hash the delivered artefacts so a consumer can verify which build this
      // SBOM describes.
      const bundleHashes = [];
      for (const chunk of entryChunks) {
        bundleHashes.push({
          fileName: chunk.fileName,
          alg: "SHA-512",
          content: crypto.createHash("sha512").update(chunk.code, "utf8").digest("hex"),
        });
      }

      const typeIdentifier = projectPackageJson.config?.tspci?.typeIdentifier;
      const componentProperties = [
        ...(typeIdentifier ? [{ name: "tspci:typeIdentifier", value: typeIdentifier }] : []),
        ...bundleHashes.map((hash) => ({ name: "tspci:bundleFile", value: hash.fileName })),
        ...(settings.supportPeriodEnd
          ? [{ name: "tspci:supportPeriodEnd", value: String(settings.supportPeriodEnd) }]
          : []),
        ...(settings.properties || []),
      ];
      const supplier = supplierFrom(settings.supplier || projectPackageJson.author);
      const projectLicenses = licensesFor(projectPackageJson);

      const includeTimestamp =
        settings.timestamp === true || process.env.TSPCI_SBOM_TIMESTAMP === "1";

      const document = {
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        version: 1,
        serialNumber: serialNumberFor(
          `${rootRef}:${bundleHashes.map((hash) => hash.content).join(":")}:${components.length}`
        ),
        metadata: {
          ...(includeTimestamp ? { timestamp: new Date().toISOString() } : {}),
          tools: {
            components: [
              {
                type: "application",
                name: cliPackageJson?.name || "@citolab/tspci",
                ...(cliPackageJson?.version ? { version: cliPackageJson.version } : {}),
              },
            ],
          },
          component: {
            type: "library",
            "bom-ref": rootRef,
            name: projectPackageJson.name || "pci",
            version: projectPackageJson.version || "0.0.0",
            ...(projectPackageJson.description ? { description: projectPackageJson.description } : {}),
            purl: rootRef,
            ...(supplier ? { supplier } : {}),
            ...(projectLicenses ? { licenses: projectLicenses } : {}),
            ...(bundleHashes.length > 0
              ? { hashes: bundleHashes.map(({ alg, content }) => ({ alg, content })) }
              : {}),
            ...(settings.externalReferences ? { externalReferences: settings.externalReferences } : {}),
            ...(componentProperties.length > 0 ? { properties: componentProperties } : {}),
          },
        },
        components,
        dependencies,
      };

      const fileName = settings.fileName || DEFAULT_FILE_NAME;
      const outputFile = path.join(outputDir, fileName);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");
      console.log(
        `SBOM written to ${path.relative(projectRoot, outputFile)} (${components.length} bundled component${
          components.length === 1 ? "" : "s"
        })`
      );

      warnAboutGaps({
        projectRoot,
        settings,
        unknownModules,
        projectModules,
        entryChunks,
        components,
      });
    },
  };
}

// Everything the module graph cannot see stays invisible in the SBOM. Making
// that explicit is the point: a silently missing component is worse than a
// warning at build time.
// Rollup warnings raised from an output hook are collected by loadConfigFile
// and never flushed by the cli, so these are printed directly.
const warn = (message) => console.warn(chalk.yellow(`SBOM: ${message}`));

function warnAboutGaps({ projectRoot, settings, unknownModules, projectModules, entryChunks, components }) {
  if (settings.warnings === false) {
    return;
  }
  const relative = (moduleId) => toPosix(path.relative(projectRoot, moduleId));

  for (const moduleId of unknownModules) {
    warn(
      `cannot determine the package of ${relative(
        moduleId
      )}, its code is bundled but not listed as a component`
    );
  }

  const vendored = projectModules.filter((moduleId) =>
    VENDORED_PATTERNS.some((pattern) => pattern.test(moduleId))
  );
  for (const moduleId of vendored) {
    warn(
      `${relative(
        moduleId
      )} looks like vendored third party code. Add it to config.tspci.sbom.additionalComponents so it is documented.`
    );
  }

  const remoteScripts = new Set();
  for (const chunk of entryChunks) {
    for (const match of chunk.code.matchAll(REMOTE_SCRIPT_PATTERN)) {
      remoteScripts.add(match[0]);
    }
  }
  const indexHtml = path.join(projectRoot, "src", "index.html");
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, "utf8");
    for (const match of html.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi)) {
      remoteScripts.add(match[1]);
    }
  }
  // A runtime dependency that is already declared manually needs no warning.
  const declared = new Set();
  for (const component of settings.additionalComponents || []) {
    if (component?.name) {
      declared.add(String(component.name).toLowerCase());
    }
    for (const reference of component?.externalReferences || []) {
      if (reference?.url) {
        declared.add(String(reference.url).toLowerCase());
      }
    }
  }
  for (const url of remoteScripts) {
    const lowered = url.toLowerCase();
    if ([...declared].some((value) => lowered === value || lowered.includes(value))) {
      continue;
    }
    warn(
      `${url} is loaded at runtime and is not part of the bundle. Add it to config.tspci.sbom.additionalComponents so it is documented.`
    );
  }

  const withoutLicense = components.filter((component) => !component.licenses).length;
  if (withoutLicense > 0) {
    warn(
      `${withoutLicense} bundled component${
        withoutLicense === 1 ? " has" : "s have"
      } no license information in their package.json`
    );
  }
}
