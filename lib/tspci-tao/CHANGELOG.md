# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/Citolab/tspci/compare/v2.16.1...v3.0.0) (2026-11-03)


### Bug Fixes

* **package:** update gitHead to latest commit hash ([fceaa88](https://github.com/Citolab/tspci/commit/fceaa883a9c0af46640581ce8b87738eb3c77503))


* feat!: PCI Authoring Profile 1.0 (docs/spec) as the authoring.json contract ([6dbc022](https://github.com/Citolab/tspci/commit/6dbc022b80d44a9a32146f7e70fbe0e6d829c43d))


### Features

* @citolab/pci-authoring, and Download on the dev page ([8043890](https://github.com/Citolab/tspci/commit/8043890552725140cea01af7f4382b1df821549b))
* add media handling and module splitting for PCI ([754f1cd](https://github.com/Citolab/tspci/commit/754f1cd97337efa99619637a713c745366a8b247))
* **dev:** Download shows the PCI files, the QTI 3 item, and a button per exporter ([b0d9a11](https://github.com/Citolab/tspci/commit/b0d9a115abbddd0d5bacd9633bfbc2194f191737))
* **dev:** files from the authoring mode and template variables on the dev page ([a552dc4](https://github.com/Citolab/tspci/commit/a552dc45ffa63fc28e569c8c4c33706e6f858628))


### BREAKING CHANGES

* authoring.json follows the PCI Authoring Profile 1.0. PCIs move score/role to scoring,
correctResponse "settings" to "properties", and getConfig/destroy to getProperties/oncompleted; authoring
systems read scoring, modules.paths, data-pci-media and data-pci-slot. See docs/spec/MIGRATION.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>





## [2.16.1](https://github.com/Citolab/tspci/compare/v2.16.0...v2.16.1) (2026-11-02)


### Bug Fixes

* **bundle:** use fallback for missing properties in packageData ([e11c890](https://github.com/Citolab/tspci/commit/e11c89025993767de7813975a56b4b82cd022d3f))





# [2.16.0](https://github.com/Citolab/tspci/compare/v2.15.1...v2.16.0) (2026-11-02)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.15.1](https://github.com/Citolab/tspci/compare/v2.15.0...v2.15.1) (2026-10-30)


### Bug Fixes

* **tspci-tao:** declare the PCI's own response in imsPciCreator.json ([3dd497a](https://github.com/Citolab/tspci/commit/3dd497aa1b9b9a0ca12fbd00df8befa31b154bc0))





# [2.15.0](https://github.com/Citolab/tspci/compare/v2.14.0...v2.15.0) (2026-10-17)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.14.0](https://github.com/Citolab/tspci/compare/v2.13.0...v2.14.0) (2026-10-14)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.13.0](https://github.com/Citolab/tspci/compare/v2.12.1...v2.13.0) (2026-10-14)


### Features

* **tspci-tao:** typed properties form and a Configure button in TAO ([406a940](https://github.com/Citolab/tspci/commit/406a940fde13990c14bda3984a8a4451c49617d1))





## [2.12.1](https://github.com/Citolab/tspci/compare/v2.12.0...v2.12.1) (2026-08-19)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.12.0](https://github.com/Citolab/tspci/compare/v2.11.0...v2.12.0) (2026-08-19)


### Features

* include the SBOM in the exported package by default ([376b89a](https://github.com/Citolab/tspci/commit/376b89a5651bb9a420fbd2973d221a7e5200bd35))





# [2.11.0](https://github.com/Citolab/tspci/compare/v2.10.0...v2.11.0) (2026-08-19)


### Features

* generate a CycloneDX SBOM of the bundle ([fdc8cf7](https://github.com/Citolab/tspci/commit/fdc8cf7caf8d25b58737866d654315e6cb2e6fcf))





# [2.10.0](https://github.com/Citolab/tspci/compare/v2.9.13...v2.10.0) (2026-08-18)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.13](https://github.com/Citolab/tspci/compare/v2.9.12...v2.9.13) (2026-03-18)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.12](https://github.com/Citolab/tspci/compare/v2.9.11-beta.1...v2.9.12) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.11-beta.1](https://github.com/Citolab/tspci/compare/v2.9.11-beta.0...v2.9.11-beta.1) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.11-beta.0](https://github.com/Citolab/tspci/compare/v2.9.10...v2.9.11-beta.0) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.10](https://github.com/Citolab/tspci/compare/v2.9.9...v2.9.10) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.9](https://github.com/Citolab/tspci/compare/v2.9.8...v2.9.9) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.8](https://github.com/Citolab/tspci/compare/v2.9.7...v2.9.8) (2026-03-11)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.7](https://github.com/Citolab/tspci/compare/v2.9.6...v2.9.7) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.6](https://github.com/Citolab/tspci/compare/v2.9.5...v2.9.6) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.5](https://github.com/Citolab/tspci/compare/v2.9.4...v2.9.5) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.4](https://github.com/Citolab/tspci/compare/v2.9.3...v2.9.4) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.3](https://github.com/Citolab/tspci/compare/v2.9.2...v2.9.3) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.2](https://github.com/Citolab/tspci/compare/v2.9.1...v2.9.2) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.9.1](https://github.com/Citolab/tspci/compare/v2.9.0...v2.9.1) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.9.0](https://github.com/Citolab/tspci/compare/v2.8.4...v2.9.0) (2026-03-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.8.4](https://github.com/Citolab/tspci/compare/v2.8.3...v2.8.4) (2026-02-25)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.8.3](https://github.com/Citolab/tspci/compare/v2.8.2...v2.8.3) (2026-02-25)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.8.2](https://github.com/Citolab/tspci/compare/v2.8.1...v2.8.2) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.8.1](https://github.com/Citolab/tspci/compare/v2.8.0...v2.8.1) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.8.0](https://github.com/Citolab/tspci/compare/v2.7.1...v2.8.0) (2026-02-24)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.7.1](https://github.com/Citolab/tspci/compare/v2.7.0...v2.7.1) (2026-02-09)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.7.0](https://github.com/Citolab/tspci/compare/v2.6.8...v2.7.0) (2026-02-09)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.8](https://github.com/Citolab/tspci/compare/v2.6.7...v2.6.8) (2026-02-02)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.7](https://github.com/Citolab/tspci/compare/v2.6.6...v2.6.7) (2026-02-02)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.6](https://github.com/Citolab/tspci/compare/v2.6.5...v2.6.6) (2026-02-02)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.5](https://github.com/Citolab/tspci/compare/v2.6.3-beta.3...v2.6.5) (2025-04-16)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.3-beta.3](https://github.com/Citolab/tspci/compare/v2.6.3-beta.2...v2.6.3-beta.3) (2025-04-16)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.3-beta.2](https://github.com/Citolab/tspci/compare/v2.6.3-beta.1...v2.6.3-beta.2) (2025-04-16)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.3-beta.1](https://github.com/Citolab/tspci/compare/v2.6.3-beta.0...v2.6.3-beta.1) (2025-04-14)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.3-beta.0](https://github.com/Citolab/tspci/compare/v2.6.2...v2.6.3-beta.0) (2025-04-14)


### Features

* implement setResponse method in PCI ([1e4dffa](https://github.com/Citolab/tspci/commit/1e4dffac9a182096f750c7c57a7b6096270608a7))





## [2.6.2](https://github.com/Citolab/tspci/compare/v2.6.1...v2.6.2) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.6.1](https://github.com/Citolab/tspci/compare/v2.6.0...v2.6.1) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.6.0](https://github.com/Citolab/tspci/compare/v2.5.30-beta.11...v2.6.0) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





# [2.6.0](https://github.com/Citolab/tspci/compare/v2.5.30-beta.11...v2.6.0) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.11](https://github.com/Citolab/tspci/compare/v2.5.30-beta.10...v2.5.30-beta.11) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.10](https://github.com/Citolab/tspci/compare/v2.5.30-beta.9...v2.5.30-beta.10) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.9](https://github.com/Citolab/tspci/compare/v2.5.30-beta.8...v2.5.30-beta.9) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.8](https://github.com/Citolab/tspci/compare/v2.5.30-beta.7...v2.5.30-beta.8) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.7](https://github.com/Citolab/tspci/compare/v2.5.30-beta.6...v2.5.30-beta.7) (2025-02-04)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.6](https://github.com/Citolab/tspci/compare/v2.5.30-beta.5...v2.5.30-beta.6) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.5](https://github.com/Citolab/tspci/compare/v2.5.30-beta.4...v2.5.30-beta.5) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.4](https://github.com/Citolab/tspci/compare/v2.5.30-beta.3...v2.5.30-beta.4) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.3](https://github.com/Citolab/tspci/compare/v2.5.30-beta.2...v2.5.30-beta.3) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.2](https://github.com/Citolab/tspci/compare/v2.5.30-beta.1...v2.5.30-beta.2) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.1](https://github.com/Citolab/tspci/compare/v2.5.30-beta.0...v2.5.30-beta.1) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.30-beta.0](https://github.com/Citolab/tspci/compare/v2.5.29...v2.5.30-beta.0) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.29 (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.28](https://github.com/Citolab/tspci/compare/v2.5.27...v2.5.28) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.27](https://github.com/Citolab/tspci/compare/v2.5.26...v2.5.27) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.26](https://github.com/Citolab/tspci/compare/v2.5.25...v2.5.26) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.25](https://github.com/Citolab/tspci/compare/v2.5.24...v2.5.25) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.24](https://github.com/Citolab/tspci/compare/v2.5.23...v2.5.24) (2025-02-03)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.23 (2024-10-16)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.22 (2024-10-16)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.21 (2024-10-16)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.20 (2024-10-16)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.19 (2024-10-15)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.18 (2024-10-15)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.17 (2024-10-15)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.16 (2024-10-15)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.15 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.14 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.13 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.12 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.11 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.10 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.9 (2024-10-11)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.8 (2024-10-10)

**Note:** Version bump only for package @citolab/tspci-tao





## 2.5.7 (2024-10-10)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.6](https://github.com/Citolab/tspci/compare/v2.5.5...v2.5.6) (2024-10-10)

**Note:** Version bump only for package @citolab/tspci-tao





## [2.5.5](https://github.com/Citolab/tspci/compare/v2.5.4...v2.5.5) (2024-10-10)

**Note:** Version bump only for package @citolab/tspci-tao
