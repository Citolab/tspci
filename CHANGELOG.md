# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.16.1...v3.0.0) (2026-11-03)


### Bug Fixes

* **build:** keep fixed media out of the dist/assets copy ([173d369](https://github.com/Citolab/qti-pci-bundler/commit/173d3693e36637c0e078b3dc01d3cb3558db5ed6))
* **package:** update gitHead to latest commit hash ([fceaa88](https://github.com/Citolab/qti-pci-bundler/commit/fceaa883a9c0af46640581ce8b87738eb3c77503))


* feat(spec)!: three ways to the correct response; record fields with `when` ([b1555e1](https://github.com/Citolab/qti-pci-bundler/commit/b1555e1892464966ac2358b1203479f413a93d8d))
* feat(tspci-qti3)!: write the item with @citolab/pci-authoring ([5c4fa26](https://github.com/Citolab/qti-pci-bundler/commit/5c4fa2694b16df8db92c7e5fe9bddbb379b4c7a6))
* feat!: PCI Authoring Profile 1.0 (docs/spec) as the authoring.json contract ([6dbc022](https://github.com/Citolab/qti-pci-bundler/commit/6dbc022b80d44a9a32146f7e70fbe0e6d829c43d))


### Features

* @citolab/pci-authoring, and Download on the dev page ([8043890](https://github.com/Citolab/qti-pci-bundler/commit/8043890552725140cea01af7f4382b1df821549b))
* add media handling and module splitting for PCI ([754f1cd](https://github.com/Citolab/qti-pci-bundler/commit/754f1cd97337efa99619637a713c745366a8b247))
* **authoring:** map split modules in the authoring frame, derive authoring properties ([72e18bb](https://github.com/Citolab/qti-pci-bundler/commit/72e18bb77def68ad41dc9f0d2c263c37dc584cb9))
* **dev:** a correct response with margins for the QTI 3 item ([298e950](https://github.com/Citolab/qti-pci-bundler/commit/298e9503d5c07358168457a5626626c6d552541f))
* **dev:** Download shows the PCI files, the QTI 3 item, and a button per exporter ([b0d9a11](https://github.com/Citolab/qti-pci-bundler/commit/b0d9a115abbddd0d5bacd9633bfbc2194f191737))
* **dev:** files from the authoring mode and template variables on the dev page ([a552dc4](https://github.com/Citolab/qti-pci-bundler/commit/a552dc45ffa63fc28e569c8c4c33706e6f858628))
* **pci-authoring:** correct responses for records, margins, and `when` ([1d16463](https://github.com/Citolab/qti-pci-bundler/commit/1d16463f7fa6aef0e7e71d4d895186f7952973ad))
* **pci-authoring:** itemProblems, and no QTI 3 item while a required field is empty ([ea1970e](https://github.com/Citolab/qti-pci-bundler/commit/ea1970ec0a0c17ffba5038e0e9d061eed7aec43a))
* **spec:** files from the authoring mode, template variables, a modal authoring mode ([603cc30](https://github.com/Citolab/qti-pci-bundler/commit/603cc30e7a8e18f7a474a76324f0087a780d0e5f))
* **spec:** setting names with `_`; toolWhen for a PCI that is a tool in one mode ([c18a229](https://github.com/Citolab/qti-pci-bundler/commit/c18a22918b185c06597bfc8b885faf2aeffc832a))


### BREAKING CHANGES

* record fields lose `editor` (mediaTime, mediaPoint) and its companions; the author answers
the PCI for the correct value.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* tspci-qti3 needs the authoring.json of tspci 3 next to the bundle, writes every setting as a
data- attribute, and no longer puts a <div> (or the prompt setting) in the interaction markup.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* authoring.json follows the PCI Authoring Profile 1.0. PCIs move score/role to scoring,
correctResponse "settings" to "properties", and getConfig/destroy to getProperties/oncompleted; authoring
systems read scoring, modules.paths, data-pci-media and data-pci-slot. See docs/spec/MIGRATION.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>





## [2.16.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.16.0...v2.16.1) (2026-11-02)


### Bug Fixes

* **bundle:** use fallback for missing properties in packageData ([e11c890](https://github.com/Citolab/qti-pci-bundler/commit/e11c89025993767de7813975a56b4b82cd022d3f))





# [2.16.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.15.1...v2.16.0) (2026-11-02)

### Features

* **cli:** enhance watcher to persist until dev server stops ([169759b](https://github.com/Citolab/qti-pci-bundler/commit/169759ba66b43c92661de5a9d8f59fcb42a96f0b))


## [2.15.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.15.0...v2.15.1) (2026-10-30)


### Bug Fixes

* **tspci-tao:** declare the PCI's own response in imsPciCreator.json ([3dd497a](https://github.com/Citolab/qti-pci-bundler/commit/3dd497aa1b9b9a0ca12fbd00df8befa31b154bc0))





# [2.15.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.14.0...v2.15.0) (2026-10-17)


### Features

* **tspci:** correct response from the settings, margins and tools in the authoring descriptor ([86f2628](https://github.com/Citolab/qti-pci-bundler/commit/86f2628b6c71492a9c38db24172ae72701dea645))





# [2.14.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.13.0...v2.14.0) (2026-10-14)


### Features

* **preact-store:** unsubscribe functions, typed actions and listeners told about reset and restore ([ca79fe0](https://github.com/Citolab/qti-pci-bundler/commit/ca79fe0bc80046eab51876a3aa45aea01bc697aa))
* **tspci:** the preact template uses typed store actions and the unsubscribe function ([5297db7](https://github.com/Citolab/qti-pci-bundler/commit/5297db72a3d2c62cdba58c1b2fe49bbbdee1e024))





# [2.13.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.12.1...v2.13.0) (2026-10-14)


### Bug Fixes

* **tspci-qbci:** load the dev page libraries from tspci's own dependencies ([90bb3b4](https://github.com/Citolab/qti-pci-bundler/commit/90bb3b4811c2e3d652e7fba9dd2101696dfbd027))
* **tspci:** give Tailwind 4 variables their defaults in the PCI's shadow root ([3d95703](https://github.com/Citolab/qti-pci-bundler/commit/3d957035fe612c11759803f1f68dcca4305d7dc0))


### Features

* **tspci-qti3:** ship authoring.json and declare the response from config.tspci ([8921cb4](https://github.com/Citolab/qti-pci-bundler/commit/8921cb4f7a6e07d1e5170e2646d0d4e98313e149))
* **tspci-tao:** typed properties form and a Configure button in TAO ([406a940](https://github.com/Citolab/qti-pci-bundler/commit/406a940fde13990c14bda3984a8a4451c49617d1))
* **tspci:** authoring descriptor, typed settings and a dev page without CDNs ([436ef53](https://github.com/Citolab/qti-pci-bundler/commit/436ef53d2652059ebfd7921d18c2d582f190e0e8))
* **tspci:** authoring mode for PCIs that fill settings themselves ([5892fa7](https://github.com/Citolab/qti-pci-bundler/commit/5892fa7e39e02abd7988b0539a61bb94927ce46e))





## [2.12.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.12.0...v2.12.1) (2026-08-19)


### Bug Fixes

* make the generated tsconfig ready for TypeScript 6 ([cdcc84d](https://github.com/Citolab/qti-pci-bundler/commit/cdcc84d8c45b6c39555f983b3488a32152df0b95))





# [2.12.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.11.0...v2.12.0) (2026-08-19)


### Features

* include the SBOM in the exported package by default ([376b89a](https://github.com/Citolab/qti-pci-bundler/commit/376b89a5651bb9a420fbd2973d221a7e5200bd35))





# [2.11.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.10.0...v2.11.0) (2026-08-19)


### Features

* generate a CycloneDX SBOM of the bundle ([fdc8cf7](https://github.com/Citolab/qti-pci-bundler/commit/fdc8cf7caf8d25b58737866d654315e6cb2e6fcf))





# [2.10.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.13...v2.10.0) (2026-08-18)


### Features

* **types:** carry the response declaration in the getInstance configuration ([9e92da8](https://github.com/Citolab/qti-pci-bundler/commit/9e92da8705c22c8d8c6f35a1a1a50175ee904f02)), closes [1EdTech/qti-project-management#210](https://github.com/1EdTech/qti-project-management/issues/210)
* update dependencies and add settings for npm-check-updates ([1b65ffe](https://github.com/Citolab/qti-pci-bundler/commit/1b65ffea6376b9de72ab1fa3cd17f9ec7c27b28f))





## [2.9.13](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.12...v2.9.13) (2026-03-18)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.12](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.11-beta.1...v2.9.12) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.11-beta.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.11-beta.0...v2.9.11-beta.1) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.11-beta.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.10...v2.9.11-beta.0) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.10](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.9...v2.9.10) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.9](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.8...v2.9.9) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.8](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.7...v2.9.8) (2026-03-11)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.7](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.6...v2.9.7) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.6](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.5...v2.9.6) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.5](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.4...v2.9.5) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.4](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.3...v2.9.4) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.3](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.2...v2.9.3) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.2](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.1...v2.9.2) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





## [2.9.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.9.0...v2.9.1) (2026-03-09)

**Note:** Version bump only for package qti-pci-bundler





# [2.9.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.8.4...v2.9.0) (2026-03-09)


### Features

* **tspci-dev-app:** add local development app for testing @citolab/tspci changes ([e87ac7d](https://github.com/Citolab/qti-pci-bundler/commit/e87ac7d822dd21ebabc5127d59104ca4e289e247))





## [2.8.4](https://github.com/Citolab/qti-pci-bundler/compare/v2.8.3...v2.8.4) (2026-02-25)

**Note:** Version bump only for package qti-pci-bundler





## [2.8.3](https://github.com/Citolab/qti-pci-bundler/compare/v2.8.2...v2.8.3) (2026-02-25)

**Note:** Version bump only for package qti-pci-bundler





## [2.8.2](https://github.com/Citolab/qti-pci-bundler/compare/v2.8.1...v2.8.2) (2026-02-24)

**Note:** Version bump only for package qti-pci-bundler





## [2.8.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.8.0...v2.8.1) (2026-02-24)

**Note:** Version bump only for package qti-pci-bundler





# [2.8.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.7.1...v2.8.0) (2026-02-24)


### Features

* add local test initialization scripts and rollup plugins ([582f4d8](https://github.com/Citolab/qti-pci-bundler/commit/582f4d8f4705714be979b7cd59f71184a3ad2a5e))
* enhance CLI options handling and project path resolution ([f9b51c6](https://github.com/Citolab/qti-pci-bundler/commit/f9b51c6a60999d4fc33ebaa2fbd8e19b35b05606))





## [2.7.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.7.0...v2.7.1) (2026-02-09)

**Note:** Version bump only for package qti-pci-bundler





# [2.7.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.8...v2.7.0) (2026-02-09)


### Features

* add QTI 3 package support with bundling functionality ([5a2951a](https://github.com/Citolab/qti-pci-bundler/commit/5a2951ae87d8fd53f7c7c5bfce8d5cef5a99ecdc))





## [2.6.8](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.7...v2.6.8) (2026-02-02)

**Note:** Version bump only for package qti-pci-bundler





## [2.6.7](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.6...v2.6.7) (2026-02-02)

**Note:** Version bump only for package qti-pci-bundler





## [2.6.6](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.5...v2.6.6) (2026-02-02)

**Note:** Version bump only for package qti-pci-bundler





## [2.6.5](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.3-beta.3...v2.6.5) (2025-04-16)

- moved setResponse from the TAO implementation to base. Now also used to set the response when boundTo is passed in the getInstance function

## [2.6.3-beta.3](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.3-beta.2...v2.6.3-beta.3) (2025-04-16)

**Note:** Version bump only for package qti-pci-bundler

## [2.6.3-beta.2](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.3-beta.1...v2.6.3-beta.2) (2025-04-16)

**Note:** Version bump only for package qti-pci-bundler

## [2.6.3-beta.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.3-beta.0...v2.6.3-beta.1) (2025-04-14)

**Note:** Version bump only for package qti-pci-bundler

## [2.6.3-beta.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.2...v2.6.3-beta.0) (2025-04-14)

### Bug Fixes

- update tailwindcss version to 4.1.3 in package.json and package-lock.json ([55c8ccb](https://github.com/Citolab/qti-pci-bundler/commit/55c8ccb6493ee85edd100d43fb910a11af33a8af))

### Features

- implement setResponse method in PCI ([1e4dffa](https://github.com/Citolab/qti-pci-bundler/commit/1e4dffac9a182096f750c7c57a7b6096270608a7))

## [2.6.2](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.1...v2.6.2) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

## [2.6.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.6.0...v2.6.1) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

# [2.6.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.11...v2.6.0) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

# [2.6.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.11...v2.6.0) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.11](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.10...v2.5.30-beta.11) (2025-02-04)

### Features

- add tailwindcss to devDependencies and set version based on @tailwindcss/postcss ([907b541](https://github.com/Citolab/qti-pci-bundler/commit/907b541e8fa52a8e0751de6318e39bbcda6cee5e))

## [2.5.30-beta.10](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.9...v2.5.30-beta.10) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.9](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.8...v2.5.30-beta.9) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.8](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.7...v2.5.30-beta.8) (2025-02-04)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.7](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.6...v2.5.30-beta.7) (2025-02-04)

### Features

- dispatch qti-interaction-changed event ([5c81bab](https://github.com/Citolab/qti-pci-bundler/commit/5c81bab7208d4ac2a8ba427d5f9f6f532267e844))

## [2.5.30-beta.6](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.5...v2.5.30-beta.6) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.5](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.4...v2.5.30-beta.5) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.4](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.3...v2.5.30-beta.4) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.3](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.2...v2.5.30-beta.3) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.2](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.1...v2.5.30-beta.2) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.1](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.30-beta.0...v2.5.30-beta.1) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.30-beta.0](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.29...v2.5.30-beta.0) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.29 (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.28](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.27...v2.5.28) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.27](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.26...v2.5.27) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.26](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.25...v2.5.26) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.25](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.24...v2.5.25) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.24](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.23...v2.5.24) (2025-02-03)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.23 (2024-10-16)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.22 (2024-10-16)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.21 (2024-10-16)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.20 (2024-10-16)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.19 (2024-10-15)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.18 (2024-10-15)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.17 (2024-10-15)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.16 (2024-10-15)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.15 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.14 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.13 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.12 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.11 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.10 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.9 (2024-10-11)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.8 (2024-10-10)

**Note:** Version bump only for package qti-pci-bundler

## 2.5.7 (2024-10-10)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.6](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.5...v2.5.6) (2024-10-10)

**Note:** Version bump only for package qti-pci-bundler

## [2.5.5](https://github.com/Citolab/qti-pci-bundler/compare/v2.5.4...v2.5.5) (2024-10-10)

**Note:** Version bump only for package qti-pci-bundler
