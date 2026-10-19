import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

function filesIn(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

export function checkRepository(root) {
  root = resolve(root);
  const errors = [], imports = new Set(), assets = new Set();
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const label = file => relative(root, file).replaceAll("\\", "/");
  const fail = (file, message) => errors.push(`${label(file)}: ${message}`);

  function checkImport(file, specifier) {
    if (specifier.startsWith(".")) {
      const target = resolve(dirname(file), specifier.split(/[?#]/)[0]);
      const candidates = [target, ...[".js", ".jsx", ".mjs", ".json", ".css"].map(ext => target + ext), resolve(target, "index.js")];
      if (!candidates.some(candidate => existsSync(candidate) && statSync(candidate).isFile())) {
        fail(file, `Missing local import ${specifier}`);
      }
    } else if (!specifier.startsWith("node:") && !builtinModules.includes(specifier)) {
      const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
      if (!Object.hasOwn(dependencies, name)) fail(file, `Undeclared dependency ${name}`);
    }
    imports.add(`${file}:${specifier}`);
  }

  function checkAsset(file, value) {
    if (typeof value !== "string" || !/^(?:\.\/)?(?:assets|data|reports)\/[^?#\n]+\.(?:svg|png|webp|jpe?g|json|csv|pdf)$/.test(value)) return;
    const target = resolve(root, "public", value);
    if (!existsSync(target) || !statSync(target).isFile()) fail(file, `Missing public asset ${value}`);
    assets.add(target);
  }

  function visitJson(file, value) {
    if (Array.isArray(value)) value.forEach(item => visitJson(file, item));
    else if (value && typeof value === "object") Object.values(value).forEach(item => visitJson(file, item));
    else checkAsset(file, value);
  }

  function visitModule(file, node) {
    if (!node || typeof node !== "object") return;
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type) && node.source) {
      checkImport(file, node.source.value);
      return;
    }
    if (node.type === "CallExpression" && node.callee.type === "Import" && node.arguments[0]?.type === "StringLiteral") {
      checkImport(file, node.arguments[0].value);
    }
    if (node.type === "StringLiteral") checkAsset(file, node.value);
    if (node.type === "TemplateElement") checkAsset(file, node.value.cooked);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(item => visitModule(file, item));
      else if (value && typeof value === "object") visitModule(file, value);
    }
  }

  const files = ["src", "scripts", "public/data"].flatMap(directory => filesIn(resolve(root, directory)));
  if (existsSync(resolve(root, "vite.config.js"))) files.push(resolve(root, "vite.config.js"));
  for (const file of files) {
    try {
      if (extname(file) === ".json") visitJson(file, JSON.parse(readFileSync(file, "utf8")));
      else if (/\.(?:m?js|jsx)$/.test(file)) visitModule(file, parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx", "importAttributes"] }));
    } catch (error) {
      fail(file, error.message);
    }
  }
  return { errors, files: files.length, imports: imports.size, assets: assets.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkRepository(fileURLToPath(new URL("..", import.meta.url)));
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Repository check passed: ${result.files} files, ${result.imports} imports, ${result.assets} public assets.`);
  }
}
