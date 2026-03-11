#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const tspciCli = path.join(repoRoot, "lib", "tspci", "src", "cli.js");
const pcisRoot = path.join(repoRoot, "pcis");
const tspciPackageDir = path.join(repoRoot, "lib", "tspci");
const preactStorePackageDir = path.join(repoRoot, "lib", "preact-store");

const variants = [
  {
    folder: "tailwind-react",
    projectType: "preact+tailwind",
    description: "Generated local tailwind+preact app for tspci development",
  },
  {
    folder: "typescript",
    projectType: "typescript",
    description: "Generated local TypeScript app for tspci development",
  },
  {
    folder: "javascript",
    projectType: "javascript",
    description: "Generated local JavaScript app for tspci development",
  },
];

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runCapture = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }
  return (result.stdout || "").trim();
};

const packLocalPackage = (packageDir) => {
  const tgzFile = runCapture("npm", ["pack", "--silent", "--ignore-scripts"], packageDir)
    .split(/\r?\n/)
    .at(-1);
  return path.join(packageDir, tgzFile);
};

const patchPackageJson = (projectDir, tspciTarballPath, preactStoreTarballPath) => {
  const packageJsonPath = path.join(projectDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies["@citolab/tspci"] = `file:${tspciTarballPath}`;

  if (packageJson.dependencies?.["@citolab/preact-store"]) {
    packageJson.dependencies["@citolab/preact-store"] = `file:${preactStoreTarballPath}`;
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
};

fs.mkdirSync(pcisRoot, { recursive: true });
const tarballs = [packLocalPackage(tspciPackageDir), packLocalPackage(preactStorePackageDir)];

try {
  for (const variant of variants) {
    console.log(`\nGenerating ${variant.folder} (${variant.projectType})`);
    run(
      process.execPath,
      [
        tspciCli,
        "init",
        "--force",
        "--no-install",
        "--path",
        pcisRoot,
        "--name",
        variant.folder,
        "--description",
        variant.description,
        "--project-type",
        variant.projectType,
      ],
      repoRoot
    );

    const projectDir = path.join(pcisRoot, variant.folder);
    patchPackageJson(projectDir, tarballs[0], tarballs[1]);
    run("npm", ["install", "--workspaces=false"], projectDir);
  }
} finally {
  for (const tarball of tarballs) {
    try {
      fs.rmSync(tarball, { force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

console.log("\nGenerated all PCI variants in pcis/");
