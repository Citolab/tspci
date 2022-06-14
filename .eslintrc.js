module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    amd: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 13,
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/no-empty-function":"off"
  },
  globals: {
    "process": true // https://stackoverflow.com/a/56777068/2877965
  }
};
