# 2.12.1

- `tspci init` now writes a tsconfig that is ready for TypeScript 6: an explicit `rootDir` of `./src`, `moduleResolution: "bundler"` instead of the deprecated node10 resolution, `module: "esnext"` and `lib: es2017`
- existing PCIs keep their own tsconfig.json, apply the same four changes there to silence the TypeScript 6 warnings

# 2.12.0

- the SBOM is now included in the exported package by default, next to the bundle it describes: `resources/pci/sbom.cdx.json` (qti3), `interaction/runtime/js/sbom.cdx.json` (tao), `ref/script/sbom.cdx.json` (qbci)
- a copy is still written next to the package as `<package-name>.sbom.cdx.json` for your own technical documentation
- `--no-include-sbom` (or `config.tspci.sbom.includeInPackage: false`) keeps it out of the package, `--no-sbom` still skips it altogether
- replaces `--include-sbom` from 2.11.0, which is now the default. The flag is still accepted and does nothing

  A file next to the zip does not survive an import into an authoring system, and that system is exactly
  the party that needs the SBOM: it is the manufacturer of the complete product and has to document the
  components it integrates.

# 2.11.0

- every production build writes a CycloneDX 1.6 SBOM of the bundle to `dist/sbom.cdx.json`, and a package export copies it next to the package as `<package-name>.sbom.cdx.json`
- the SBOM is built from the rollup module graph, so it lists the packages whose code is actually in the bundle instead of the build time dependency tree
- `--include-sbom` also puts the SBOM inside the exported package, `--no-sbom` skips generating one
- configurable with `config.tspci.sbom` in package.json: supplier, support period, external references (disclosure policy, security contact) and manually declared components
- the build warns about code the bundler cannot see: vendored files, `*.min.js` and scripts that are loaded from a cdn at runtime

_The notes for 2.4.0 up to and including 2.10.0 were reconstructed from the git history afterwards, so
they list the highlights per minor version. The patch versions in between are mostly lockstep publishes
of all packages in this repository; `CHANGELOG.md` has the complete list of published versions._

# 2.10.0

- a delivery engine can pass the response declaration of the response variable a PCI is bound to in the `getInstance` configuration, so the PCI can render the correct response itself in solution status (see 1EdTech/qti-project-management#210)
- the cli detects a missing `tslib` dependency and reports it with an install hint
- added `generate:pcis` and a dev startup smoke test to develop and test tspci changes against real PCIs
- improved layout and styling of the generated example interaction
- updated dependencies, added npm-check-updates settings

# 2.9.0

- added a local development app to test changes in @citolab/tspci against generated PCI variants
- replaced inquirer with @inquirer/prompts
- test scripts and npm path handling work on Windows, CI runs on a matrix of operating systems

# 2.8.0

- `tspci init` can run without prompts using `--name`, `--description`, `--project-type` and `--ci`
- `--path` accepts both `--path=folder` and `--path folder` (or `-p`) and is resolved relative to the current directory, nested paths are created automatically
- the project type is now a single choice instead of a multi select
- added local test scripts to initialize and smoke test all project variants

# 2.7.0

- added QTI 3 package export: `tspci --target qti3` creates a QTI 3 package with an assessment item, an assessment test and a manifest
- added `setResponse`, so a delivery engine can push a response into the PCI
- completed the QTI type definitions
- the preact preset uses a factory pattern with improved state management
- added a GPL-3.0 LICENSE file to the package
- fixed the tailwindcss version in the preset

# 2.6.0

- added a javascript project type next to typescript and preact+tailwind, including TAO support for javascript PCIs with `onCompleted` implemented by default
- added `--targetExt` (`-tx`) to export with a plugin that is not published under @citolab
- the PCI dispatches a `qti-interaction-changed` event
- renamed the `Configuration` type to `ConfigProperties` and improved type safety of the PCI interfaces
- tailwindcss is added to devDependencies with the version that matches @tailwindcss/postcss
- switched to chokidar for watching, fixed watching assets and building for the selected target

# 2.5.0

- removed node-builtins and node-globals from the rollup configuration
- TAO specific functions are ignored when a PCI only implements the IMS interface
- fixed actions in the state of the development app

# 2.4.0

- added replay functionality with a scrubber to the development app
- refactored the store, the presets are based on the new store
- the development environment uses an html template
- `typeIdentifier` is restricted to alphanumeric characters, because a hyphen breaks the PCI in TAO
- fixed installing the right version of the dependencies

# 2.3.0
- added a cli to initialize a PCI workspace (```tspci init```)
# 2.1.3
- added workaround for bug in new @rollup/plugin-terser
  see https://github.com/rollup/plugins/issues/1366#issuecomment-1345358157

# 2.1.2

- fixed production build, terser not imported correctly

# 2.1.1

- fixed production build, import rollup.config needed extension .js

# 2.1.0

- tailwind picks up correct class changes
- added ROLLUP_WATCH=true to watch task in rollup
- upgraded nearly all packages

# 2.0.0

- added customized development templates in plugins
- removed tooltips development environment pci
- fixed storing and comparing responses
- fixed reload test and restoring state

# 1.5.9

- fixed broken images in readme

## 1.5.8

- fixed command line args --target not picked up by cli 

## 1.5.7 

Initial release