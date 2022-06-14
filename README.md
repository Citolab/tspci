# @Citolab Portable Custom Interaction bundler.

A modern QTI-PCI development environment creating and testing portable custom interactions.

## Main bundler:
[Bundler](./lib/tspci/)

## Add-ons:

### Specific implementations
- [TAO](./lib/tspci-tao/)
- [Questify](./lib/tspci-questify/)

### Managing state:
- [preact-store](./lib/preact-store//)

## Installation

```sh
npm install
npm run lerna bootstrap
```

run any of the packages by running scripts in package.json