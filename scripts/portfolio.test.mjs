import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { buildSite } from "./build.mjs";
import { readProjects, renderPortfolio, renderProject } from "./portfolio.mjs";

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "irim-portfolio-test-"));
  try { run(directory); }
  finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(directory.split(/[\\/]/).at(-1).startsWith("irim-portfolio-test-"));
    rmSync(directory, { recursive: true, force: true });
  }
}

function project(root, name, filenames, category = "주거공간") {
  const directory = join(root, category, name);
  mkdirSync(directory, { recursive: true });
  for (const filename of filenames) writeFileSync(join(directory, filename), "test-photo");
  return directory;
}

test("folder title, image 1 as main, and numeric ordering with gaps", () => fixture((root) => {
  project(root, "서울 테스트 아파트", ["10.jpg", "03.webp", "01.PNG", "2.jpeg"]);
  const [entry] = readProjects(root);
  assert.equal(entry.title, "서울 테스트 아파트");
  assert.equal(entry.category, "주거공간");
  assert.equal(entry.url, `portfolio/${encodeURIComponent("주거공간")}/${encodeURIComponent(entry.title)}/index.html`);
  assert.equal(entry.main.filename, "01.PNG");
  assert.deepEqual(entry.details.map((image) => image.number), [2, 3, 10]);
  assert.match(renderProject(entry), /상세 사진 2[\s\S]*상세 사진 3[\s\S]*상세 사진 10/);
}));

test("empty template and hidden folders are not published", () => fixture((root) => {
  project(root, "지역명 아파트명", ["README.md"]);
  project(root, "지역명 상가명", ["README.md"], "상업공간");
  project(root, ".draft", ["1.jpg"]);
  project(root, "다른 분류", ["1.jpg"], "기타");
  const legacy = join(root, "예전 프로젝트");
  mkdirSync(legacy);
  writeFileSync(join(legacy, "1.jpg"), "photo");
  assert.deepEqual(readProjects(root), []);
}));

test("missing main image and duplicate numbered images fail clearly", () => fixture((root) => {
  const directory = project(root, "테스트", ["2.jpg"]);
  assert.throws(() => readProjects(root), /main image/);
  writeFileSync(join(directory, "1.jpg"), "photo");
  writeFileSync(join(directory, "01.png"), "photo");
  assert.throws(() => readProjects(root), /duplicated/);
}));

test("non-numeric images fail instead of silently dropping photos", () => fixture((root) => {
  project(root, "테스트", ["1.jpg", "IMG_0002.jpg"]);
  assert.throws(() => readProjects(root), /numbered filename/);
}));

test("commercial category filters independently from residential", () => fixture((root) => {
  project(root, "서울 주거 테스트", ["1.jpg"]);
  const directory = project(root, "서울 상업 테스트", ["1.jpg"], "상업공간");
  writeFileSync(join(directory, "project.json"), JSON.stringify({ category: "주거공간" }));
  const projects = readProjects(root);
  const commercial = renderPortfolio(projects, "상업공간");
  assert.match(commercial, /Total 1건/);
  assert.match(commercial, /서울 상업 테스트 대표 사진/);
  assert.doesNotMatch(commercial, /서울 주거 테스트 대표 사진/);
  const residential = renderPortfolio(projects, "주거공간");
  assert.match(residential, /서울 주거 테스트 대표 사진/);
  assert.doesNotMatch(residential, /서울 상업 테스트 대표 사진/);
}));

test("identical project names in different categories keep separate URLs and covers", () => fixture((root) => {
  project(root, "서울 동일 이름", ["1.jpg"]);
  project(root, "서울 동일 이름", ["01.png"], "상업공간");
  const projects = readProjects(root);
  assert.equal(projects.length, 2);
  assert.equal(new Set(projects.map((entry) => entry.url)).size, 2);
  const markup = renderPortfolio(projects);
  for (const entry of projects) {
    assert.ok(markup.includes(`href="${entry.url}"`));
    assert.ok(markup.includes(`src="${entry.urlBase}/${entry.main.url}"`));
  }
}));

test("folder names are escaped as text and encoded in URLs", () => fixture((root) => {
  project(root, "서울 '테스트 & 아파트'", ["1.jpg"]);
  const markup = renderPortfolio(readProjects(root));
  assert.match(markup, /테스트 &amp; 아파트/);
  assert.match(markup, /%26/);
  assert.doesNotMatch(markup, /서울 '테스트 & 아파트'/);
}));

test("build creates relative-path details and cleans removed photos", () => fixture((root) => {
  const directory = project(join(root, "portfolio"), "서울 테스트 아파트", ["1.jpg", "2.jpg", "10.jpg"]);
  const commercialDirectory = project(join(root, "portfolio"), "서울 테스트 상가", ["1.jpg"], "상업공간");
  const result = buildSite(root);
  assert.equal(result.pages.length, 9);
  assert.ok(result.pages.includes("portfolio/주거공간/서울 테스트 아파트/index.html"));
  assert.ok(result.pages.includes("portfolio/상업공간/서울 테스트 상가/index.html"));
  const detail = readFileSync(join(directory, "index.html"), "utf8");
  assert.match(detail, /href="\.\.\/\.\.\/\.\.\/assets\/css\/site.css"/);
  assert.match(detail, /href="\.\.\/\.\.\/\.\.\/portfolio.html"/);
  assert.match(detail, /src="\.\.\/\.\.\/\.\.\/assets\/js\/site.js"/);
  assert.match(detail, /href="\.\.\/\.\.\/\.\.\/index.html"/);
  assert.match(detail, /src="1.jpg"/);
  assert.match(detail, /src="2.jpg"[\s\S]*src="10.jpg"/);
  assert.match(detail, /<title>서울 테스트 아파트 \| 이림디자인<\/title>/);
  for (const filename of ["1.jpg", "2.jpg", "10.jpg"]) rmSync(join(directory, filename));
  rmSync(join(commercialDirectory, "1.jpg"));
  buildSite(root);
  assert.equal(existsSync(join(directory, "index.html")), false);
  assert.equal(existsSync(join(commercialDirectory, "index.html")), false);
  assert.match(readFileSync(join(root, "portfolio.html"), "utf8"), /게시물이 없습니다/);
}));

test("a single category works without the other category folder", () => fixture((root) => {
  project(root, "부산 상가", ["1.jpg"], "상업공간");
  const [entry] = readProjects(root);
  assert.equal(entry.category, "상업공간");
  assert.equal(readProjects(join(root, "missing")).length, 0);
}));

test("moving a project folder changes its category and regenerates its detail", () => fixture((root) => {
  const portfolioRoot = join(root, "portfolio");
  const oldDirectory = project(portfolioRoot, "서울 이동 테스트", ["1.jpg"]);
  buildSite(root);
  const newDirectory = join(portfolioRoot, "상업공간", "서울 이동 테스트");
  mkdirSync(dirname(newDirectory), { recursive: true });
  renameSync(oldDirectory, newDirectory);
  const result = buildSite(root);
  assert.equal(result.projects[0].category, "상업공간");
  assert.equal(existsSync(oldDirectory), false);
  assert.match(readFileSync(join(root, "portfolio-residential.html"), "utf8"), /Total 0건/);
  assert.match(readFileSync(join(root, "portfolio-commercial.html"), "utf8"), /Total 1건/);
  assert.match(readFileSync(join(newDirectory, "index.html"), "utf8"), /<p class="portfolio-category">상업공간<\/p>/);
}));

test("build protects custom HTML and existing pages on invalid input", () => fixture((root) => {
  const directory = project(join(root, "portfolio"), "서울 테스트", ["1.jpg"]);
  writeFileSync(join(directory, "index.html"), "custom project page");
  writeFileSync(join(root, "portfolio.html"), "existing list");
  assert.throws(() => buildSite(root), /will not be overwritten/);
  assert.equal(readFileSync(join(root, "portfolio.html"), "utf8"), "existing list");
  assert.equal(readFileSync(join(directory, "index.html"), "utf8"), "custom project page");
}));
