# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/Citolab/tspci/compare/v3.0.0...v3.0.1) (2026-11-03)

**Note:** Version bump only for package @citolab/pci-authoring





# [3.0.0](https://github.com/Citolab/tspci/compare/v2.16.1...v3.0.0) (2026-11-03)


* feat(spec)!: three ways to the correct response; record fields with `when` ([b1555e1](https://github.com/Citolab/tspci/commit/b1555e1892464966ac2358b1203479f413a93d8d))
* feat(tspci-qti3)!: write the item with @citolab/pci-authoring ([5c4fa26](https://github.com/Citolab/tspci/commit/5c4fa2694b16df8db92c7e5fe9bddbb379b4c7a6))


### Features

* @citolab/pci-authoring, and Download on the dev page ([8043890](https://github.com/Citolab/tspci/commit/8043890552725140cea01af7f4382b1df821549b))
* **pci-authoring:** correct responses for records, margins, and `when` ([1d16463](https://github.com/Citolab/tspci/commit/1d16463f7fa6aef0e7e71d4d895186f7952973ad))
* **pci-authoring:** itemProblems, and no QTI 3 item while a required field is empty ([ea1970e](https://github.com/Citolab/tspci/commit/ea1970ec0a0c17ffba5038e0e9d061eed7aec43a))
* **spec:** files from the authoring mode, template variables, a modal authoring mode ([603cc30](https://github.com/Citolab/tspci/commit/603cc30e7a8e18f7a474a76324f0087a780d0e5f))
* **spec:** setting names with `_`; toolWhen for a PCI that is a tool in one mode ([c18a229](https://github.com/Citolab/tspci/commit/c18a22918b185c06597bfc8b885faf2aeffc832a))


### BREAKING CHANGES

* record fields lose `editor` (mediaTime, mediaPoint) and its companions; the author answers
the PCI for the correct value.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* tspci-qti3 needs the authoring.json of tspci 3 next to the bundle, writes every setting as a
data- attribute, and no longer puts a <div> (or the prompt setting) in the interaction markup.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
