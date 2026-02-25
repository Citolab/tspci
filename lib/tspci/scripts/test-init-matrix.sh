#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TSPCI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TSPCI_DIR}/../.." && pwd)"
TEST_ROOT="${TSPCI_DIR}/tmp/init-matrix-test"
NPM_CACHE_DIR="${TSPCI_DIR}/tmp/npm-cache"

clean_dir_contents() {
  local dir_path="$1"
  mkdir -p "${dir_path}"
  find "${dir_path}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

mkdir -p "${NPM_CACHE_DIR}"
clean_dir_contents "${TEST_ROOT}"

# On Windows (Git Bash), convert Unix-style paths to native Windows paths so
# npm can resolve file: references correctly. No-op on Linux/macOS.
npm_path() {
  if command -v cygpath &>/dev/null; then
    cygpath -m "$1"
  else
    echo "$1"
  fi
}

TARBALLS=()
cleanup() {
  for file in "${TARBALLS[@]:-}"; do
    rm -f "${file}" 2>/dev/null || true
  done
}
trap cleanup EXIT

prepare_pkg_for_pack() {
  local pkg_dir="$1"
  clean_dir_contents "${pkg_dir}/tmp/init-local-test"
  clean_dir_contents "${pkg_dir}/tmp/init-matrix-test"
  rm -f "${pkg_dir}"/citolab-*.tgz
}

pack_local_pkg() {
  local pkg_dir="$1"
  local pkg_name="$2"
  local tgz
  prepare_pkg_for_pack "${pkg_dir}"
  echo "  - packing ${pkg_name}" >&2
  tgz="$(cd "${pkg_dir}" && npm pack --silent --ignore-scripts --cache "${NPM_CACHE_DIR}" | tail -n 1 | tr -d '\r')"
  local full_path="${pkg_dir}/${tgz}"
  TARBALLS+=("${full_path}")
  echo "${full_path}"
}

echo "Packing local packages..."
TSPCI_TGZ="$(pack_local_pkg "${TSPCI_DIR}" "@citolab/tspci")"
QBCI_TGZ="$(pack_local_pkg "${REPO_ROOT}/lib/tspci-qbci" "@citolab/tspci-qbci")"
QTI3_TGZ="$(pack_local_pkg "${REPO_ROOT}/lib/tspci-qti3" "@citolab/tspci-qti3")"
TAO_TGZ="$(pack_local_pkg "${REPO_ROOT}/lib/tspci-tao" "@citolab/tspci-tao")"
PREACT_STORE_TGZ="$(pack_local_pkg "${REPO_ROOT}/lib/preact-store" "@citolab/preact-store")"

create_project() {
  local project_name="$1"
  local project_type="$2"
  local description="$3"
  local project_dir="${TEST_ROOT}/${project_name}"

  node "${TSPCI_DIR}/src/cli.js" init \
    --no-install \
    --force \
    --path "${TEST_ROOT}" \
    --name "${project_name}" \
    --description "${description}" \
    --project-type "${project_type}"

  node -e '
    const fs = require("fs");
    const pkgPath = process.argv[1];
    const tspciTar = process.argv[2];
    const preactStoreTar = process.argv[3];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.devDependencies["@citolab/tspci"] = `file:${tspciTar}`;
    if (pkg.dependencies && pkg.dependencies["@citolab/preact-store"]) {
      pkg.dependencies["@citolab/preact-store"] = `file:${preactStoreTar}`;
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  ' "${project_dir}/package.json" "$(npm_path "${TSPCI_TGZ}")" "$(npm_path "${PREACT_STORE_TGZ}")"

  (cd "${project_dir}" && npm install --cache "${NPM_CACHE_DIR}" --workspaces=false)
}

assert_file() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]]; then
    echo "ERROR: expected file not found: ${file_path}" >&2
    exit 1
  fi
}

run_base_build() {
  local project_dir="$1"
  (cd "${project_dir}" && npm run prod)
  assert_file "${project_dir}/dist/index.js"
}

echo "Scenario 1: vanilla PCI creates and builds"
create_project "VanillaPci" "javascript" "Vanilla PCI matrix test"
assert_file "${TEST_ROOT}/VanillaPci/src/index.js"
run_base_build "${TEST_ROOT}/VanillaPci"

echo "Scenario 2: TypeScript PCI (without tailwind/preact) creates and builds"
create_project "TypeScriptPci" "typescript" "TypeScript PCI matrix test"
assert_file "${TEST_ROOT}/TypeScriptPci/src/index.ts"
run_base_build "${TEST_ROOT}/TypeScriptPci"

echo "Scenario 3: TypeScript + tailwind PCI creates and builds"
create_project "TypeScriptTailwindPci" "preact+tailwind" "TypeScript + tailwind PCI matrix test"
assert_file "${TEST_ROOT}/TypeScriptTailwindPci/src/index.tsx"
run_base_build "${TEST_ROOT}/TypeScriptTailwindPci"

echo "Scenario 4: add tspci-qbci and export .ci package"
create_project "QbciPci" "typescript" "QBCI export matrix test"
(cd "${TEST_ROOT}/QbciPci" && npm install --save-dev "file:$(npm_path "${QBCI_TGZ}")" --cache "${NPM_CACHE_DIR}" --workspaces=false)
(cd "${TEST_ROOT}/QbciPci" && npm run tspci -- add --target qbci)
(cd "${TEST_ROOT}/QbciPci" && npm run prod -- --target qbci)
ls "${TEST_ROOT}/QbciPci/ci-dist/"*.ci >/dev/null

echo "Scenario 5: add tspci-qti3 and export qti3 zip"
create_project "Qti3Pci" "typescript" "QTI3 export matrix test"
(cd "${TEST_ROOT}/Qti3Pci" && npm install --save-dev "file:$(npm_path "${QTI3_TGZ}")" --cache "${NPM_CACHE_DIR}" --workspaces=false)
(cd "${TEST_ROOT}/Qti3Pci" && npm run tspci -- add --target qti3)
(cd "${TEST_ROOT}/Qti3Pci" && npm run prod -- --target qti3)
ls "${TEST_ROOT}/Qti3Pci/qti3-dist/"*.zip >/dev/null

echo "Scenario 6: add tspci-tao and export tao zip"
create_project "TaoPci" "typescript" "TAO export matrix test"
(cd "${TEST_ROOT}/TaoPci" && npm install --save-dev "file:$(npm_path "${TAO_TGZ}")" --cache "${NPM_CACHE_DIR}" --workspaces=false)
(cd "${TEST_ROOT}/TaoPci" && npm run tspci -- add --target tao --ci)
node -e '
  const fs = require("fs");
  const pkgPath = process.argv[1];
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.config = pkg.config || {};
  pkg.config.tspci = pkg.config.tspci || {};
  if (!pkg.config.tspci.label) pkg.config.tspci.label = pkg.config.tspci.typeIdentifier || "tao";
  if (!pkg.config.tspci.short) pkg.config.tspci.short = String(pkg.config.tspci.label).slice(0, 5);
  if (!Array.isArray(pkg.config.tspci.score) || pkg.config.tspci.score.length === 0) {
    pkg.config.tspci.score = ["MATCH_CORRECT", "NONE"];
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
' "${TEST_ROOT}/TaoPci/package.json"
(cd "${TEST_ROOT}/TaoPci" && npm run prod -- --target tao)
ls "${TEST_ROOT}/TaoPci/dist/tao-pci-"*.zip >/dev/null

echo "Scenario 7: preact-store with TypeScript + tailwind builds"
create_project "TailwindPreactStorePci" "preact+tailwind" "Tailwind + preact-store matrix test"
(cd "${TEST_ROOT}/TailwindPreactStorePci" && npm install --save "file:$(npm_path "${PREACT_STORE_TGZ}")" --cache "${NPM_CACHE_DIR}" --workspaces=false)
run_base_build "${TEST_ROOT}/TailwindPreactStorePci"

echo ""
echo "All matrix scenarios passed."
