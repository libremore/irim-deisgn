import assert from "node:assert/strict";
import { copyFileSync, cpSync, lstatSync, mkdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readProjects } from "./portfolio.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "brand-story.html", "portfolio.html", "portfolio-residential.html", "portfolio-commercial.html", "contact.html", "location.html"];

export function packagePages(sourceRoot = root) {
  sourceRoot = resolve(sourceRoot);
  const outputRoot = join(sourceRoot, "_site");
  const projects = readProjects(join(sourceRoot, "portfolio"));
  const files = [...pages, ".nojekyll"];
  for (const project of projects) {
    const directory = join("portfolio", project.category, project.title);
    files.push(join(directory, "index.html"), ...project.images.map((image) => join(directory, image.filename)));
  }
  for (const filename of files) {
    if (!lstatSync(join(sourceRoot, filename)).isFile()) throw new Error(`Expected a regular public file: ${filename}`);
  }
  if (!statSync(join(sourceRoot, "assets")).isDirectory()) throw new Error("Missing assets directory.");

  // Only the dedicated generated output directory may be cleared.
  assert.equal(dirname(outputRoot), sourceRoot);
  assert.equal(basename(outputRoot), "_site");
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot);
  cpSync(join(sourceRoot, "assets"), join(outputRoot, "assets"), {
    recursive: true,
    filter: (filename) => {
      if (lstatSync(filename).isSymbolicLink()) throw new Error(`Public assets cannot contain symbolic links: ${filename}`);
      return true;
    },
  });
  for (const filename of files) {
    const target = join(outputRoot, filename);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(sourceRoot, filename), target);
  }
  return outputRoot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Packaged GitHub Pages site: ${packagePages()}`); }
  catch (error) { console.error(`Packaging failed: ${error.message}`); process.exitCode = 1; }
}
