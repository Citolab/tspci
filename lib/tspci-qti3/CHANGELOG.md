# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/Citolab/tspci/compare/v3.0.0...v3.0.1) (2026-11-03)

**Note:** Version bump only for package @citolab/tspci-qti3





# [3.0.0](https://github.com/Citolab/tspci/compare/v2.16.1...v3.0.0) (2026-11-03)


### Bug Fixes

* **package:** update gitHead to latest commit hash ([fceaa88](https://github.com/Citolab/tspci/commit/fceaa883a9c0af46640581ce8b87738eb3c77503))


* feat(tspci-qti3)!: write the item with @citolab/pci-authoring ([5c4fa26](https://github.com/Citolab/tspci/commit/5c4fa2694b16df8db92c7e5fe9bddbb379b4c7a6))
* feat!: PCI Authoring Profile 1.0 (docs/spec) as the authoring.json contract ([6dbc022](https://github.com/Citolab/tspci/commit/6dbc022b80d44a9a32146f7e70fbe0e6d829c43d))


### Features

* add media handling and module splitting for PCI ([754f1cd](https://github.com/Citolab/tspci/commit/754f1cd97337efa99619637a713c745366a8b247))
* **authoring:** map split modules in the authoring frame, derive authoring properties ([72e18bb](https://github.com/Citolab/tspci/commit/72e18bb77def68ad41dc9f0d2c263c37dc584cb9))
* **dev:** Download shows the PCI files, the QTI 3 item, and a button per exporter ([b0d9a11](https://github.com/Citolab/tspci/commit/b0d9a115abbddd0d5bacd9633bfbc2194f191737))


### BREAKING CHANGES

* tspci-qti3 needs the authoring.json of tspci 3 next to the bundle, writes every setting as a
data- attribute, and no longer puts a <div> (or the prompt setting) in the interaction markup.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* authoring.json follows the PCI Authoring Profile 1.0. PCIs move score/role to scoring,
correctResponse "settings" to "properties", and getConfig/destroy to getProperties/oncompleted; authoring
systems read scoring, modules.paths, data-pci-media and data-pci-slot. See docs/spec/MIGRATION.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>





## [2.16.1](https://github.com/Citolab/tspci/compare/v2.16.0...v2.16.1) (2026-11-02)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.16.0](https://github.com/Citolab/tspci/compare/v2.15.1...v2.16.0) (2026-11-02)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.14.0](https://github.com/Citolab/tspci/compare/v2.13.0...v2.14.0) (2026-10-14)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.13.0](https://github.com/Citolab/tspci/compare/v2.12.1...v2.13.0) (2026-10-14)


### Features

* **tspci-qti3:** ship authoring.json and declare the response from config.tspci ([8921cb4](https://github.com/Citolab/tspci/commit/8921cb4f7a6e07d1e5170e2646d0d4e98313e149))





## [2.12.1](https://github.com/Citolab/tspci/compare/v2.12.0...v2.12.1) (2026-08-19)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.12.0](https://github.com/Citolab/tspci/compare/v2.11.0...v2.12.0) (2026-08-19)


### Features

* include the SBOM in the exported package by default ([376b89a](https://github.com/Citolab/tspci/commit/376b89a5651bb9a420fbd2973d221a7e5200bd35))





# [2.11.0](https://github.com/Citolab/tspci/compare/v2.10.0...v2.11.0) (2026-08-19)


### Features

* generate a CycloneDX SBOM of the bundle ([fdc8cf7](https://github.com/Citolab/tspci/commit/fdc8cf7caf8d25b58737866d654315e6cb2e6fcf))





# [2.10.0](https://github.com/Citolab/tspci/compare/v2.9.13...v2.10.0) (2026-08-18)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.13](https://github.com/Citolab/tspci/compare/v2.9.12...v2.9.13) (2026-03-18)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.12](https://github.com/Citolab/tspci/compare/v2.9.11-beta.1...v2.9.12) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.11-beta.1](https://github.com/Citolab/tspci/compare/v2.9.11-beta.0...v2.9.11-beta.1) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.11-beta.0](https://github.com/Citolab/tspci/compare/v2.9.10...v2.9.11-beta.0) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.10](https://github.com/Citolab/tspci/compare/v2.9.9...v2.9.10) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.9](https://github.com/Citolab/tspci/compare/v2.9.8...v2.9.9) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.8](https://github.com/Citolab/tspci/compare/v2.9.7...v2.9.8) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.7](https://github.com/Citolab/tspci/compare/v2.9.6...v2.9.7) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.6](https://github.com/Citolab/tspci/compare/v2.9.5...v2.9.6) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.5](https://github.com/Citolab/tspci/compare/v2.9.4...v2.9.5) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.4](https://github.com/Citolab/tspci/compare/v2.9.3...v2.9.4) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.3](https://github.com/Citolab/tspci/compare/v2.9.2...v2.9.3) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.2](https://github.com/Citolab/tspci/compare/v2.9.1...v2.9.2) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.9.1](https://github.com/Citolab/tspci/compare/v2.9.0...v2.9.1) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.9.0](https://github.com/Citolab/tspci/compare/v2.8.4...v2.9.0) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.8.4](https://github.com/Citolab/tspci/compare/v2.8.3...v2.8.4) (2026-02-25)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.8.3](https://github.com/Citolab/tspci/compare/v2.8.2...v2.8.3) (2026-02-25)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.8.2](https://github.com/Citolab/tspci/compare/v2.8.1...v2.8.2) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.8.1](https://github.com/Citolab/tspci/compare/v2.8.0...v2.8.1) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.8.0](https://github.com/Citolab/tspci/compare/v2.7.1...v2.8.0) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-qti3





## [2.7.1](https://github.com/Citolab/tspci/compare/v2.7.0...v2.7.1) (2026-02-09)

**Note:** Version bump only for package @citolab/tspci-qti3





# [2.7.0](https://github.com/Citolab/tspci/compare/v2.6.8...v2.7.0) (2026-02-09)


### Features

* add QTI 3 package support with bundling functionality ([5a2951a](https://github.com/Citolab/tspci/commit/5a2951ae87d8fd53f7c7c5bfce8d5cef5a99ecdc))
