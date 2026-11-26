import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = path.join(projectRoot, "dist", "public");
const publicDir = path.join(projectRoot, "public");
const workDir = path.join(projectRoot, ".work");
const generatedManifest = path.join(workDir, "vercel-public-generated.json");

async function listFiles(directory, prefix = "") {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await listFiles(absolute, relative)));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

function resolveInsidePublic(relativePath) {
  const target = path.resolve(publicDir, relativePath);
  if (target !== publicDir && !target.startsWith(publicDir + path.sep)) {
    throw new Error(`Unsafe public asset path: ${relativePath}`);
  }
  return target;
}

const indexFile = path.join(sourceDir, "index.html");
try {
  await fs.access(indexFile);
} catch {
  throw new Error("Vite output not found at dist/public/index.html; run the web build first.");
}

let previousFiles = [];
try {
  previousFiles = JSON.parse(await fs.readFile(generatedManifest, "utf8"));
  if (!Array.isArray(previousFiles) || previousFiles.some(file => typeof file !== "string")) {
    throw new Error("Invalid generated asset manifest.");
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

for (const relative of previousFiles) {
  const target = resolveInsidePublic(relative);
  await fs.rm(target, { force: true });
}

const copiedFiles = [];
for (const relative of await listFiles(sourceDir)) {
  // This file is maintained as source in public/, not generated output.
  if (relative === "manus-routes.json") continue;
  const source = path.join(sourceDir, ...relative.split("/"));
  const target = resolveInsidePublic(relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  copiedFiles.push(relative);
}

await fs.mkdir(workDir, { recursive: true });
await fs.writeFile(generatedManifest, JSON.stringify(copiedFiles, null, 2) + "\n", "utf8");
console.log(`Prepared ${copiedFiles.length} Vercel public assets.`);
