import fs from "fs";
import path from "path";
import fg from "fast-glob";

function hasGlobSyntax(value) {
  return /[*?[\]{}()!+@]/.test(value);
}

function getGlobBase(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const baseParts = [];
  for (const part of parts) {
    if (hasGlobSyntax(part)) {
      break;
    }
    baseParts.push(part);
  }
  return baseParts.length > 0 ? baseParts.join("/") : ".";
}

function copyDirectoryRecursive(sourceDir, destinationDir, exclude) {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const item of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, item.name);
    const destinationPath = path.join(destinationDir, item.name);
    if (item.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destinationPath, exclude);
    } else if (item.isFile() && !exclude.has(path.resolve(sourcePath))) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

async function copyTarget(target, flatten, exclude) {
  const srcPattern = target?.src;
  const destination = target?.dest;
  if (!srcPattern || !destination) {
    return;
  }

  const matches = await fg(srcPattern, { dot: true, onlyFiles: false });
  if (matches.length === 0) {
    return;
  }

  const basePath = hasGlobSyntax(srcPattern) ? getGlobBase(srcPattern) : null;

  for (const match of matches) {
    const sourcePath = path.resolve(match);
    const sourceStats = fs.statSync(sourcePath);
    const basename = path.basename(sourcePath);
    const sourceDirname = path.dirname(sourcePath);

    let destinationFolder = destination;
    if (!flatten && basePath) {
      const relativeDir = path.relative(path.resolve(basePath), sourceDirname);
      destinationFolder = relativeDir ? path.join(destination, relativeDir) : destination;
    }
    const destinationPath = path.join(destinationFolder, basename);

    if (sourceStats.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destinationPath, exclude);
    } else if (sourceStats.isFile() && !exclude.has(sourcePath)) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

/**
 * Copies `targets` ({ src, dest }) at the start and end of a build. `exclude` lists files that are never copied,
 * also inside a copied folder (the fixed media, which the media plugin already puts in the bundle or dist/media).
 */
export function copyFiles(options = {}) {
  const targets = Array.isArray(options.targets) ? options.targets : [];
  const flatten = options.flatten !== false;
  const exclude = new Set((options.exclude ?? []).map((file) => path.resolve(file)));

  const copyAllTargets = async () => {
    for (const target of targets) {
      await copyTarget(target, flatten, exclude);
    }
  };

  return {
    name: "copy-files",
    async buildStart() {
      await copyAllTargets();
    },
    async writeBundle() {
      await copyAllTargets();
    },
  };
}
