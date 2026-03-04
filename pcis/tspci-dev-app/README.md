# tspci-dev-app

Local development app for testing `@citolab/tspci` changes from this monorepo.

## Usage

From repo root:

```sh
npm install
npm --prefix pcis/tspci-dev-app run dev
```

Then open the URL printed by the dev server.

This app depends on `@citolab/tspci: "*"`, so it resolves to the local workspace package.
