import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { test } from "node:test";
import { buildSite } from "./build.mjs";
import { readProjects, renderPortfolio, renderProject } from "./portfolio.mjs";
import { watchPortfolio } from "./watch-portfolio.mjs";
import { INFORMATION_TEMPLATE, readProjectInformation } from "./information.mjs";

async function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "irim-portfolio-test-"));
  try { await run(directory); }
  finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(directory.split(/[\\/]/).at(-1).startsWith("irim-portfolio-test-"));
    rmSync(directory, { recursive: true, force: true });
  }
}

function area(root, name, zone, filenames, category = "주거공간") {
  const directory = join(root, category, name, zone);
  mkdirSync(directory, { recursive: true });
  for (const filename of filenames) writeFileSync(join(directory, filename), "test-photo");
  const informationPath = join(root, category, name, "INFORMATION.md");
  if (!existsSync(informationPath)) writeFileSync(informationPath, `## 1. 아파트명과 지역\n아파트명: ${name}\n지역:\n\n## 2. 주소\n\n## 3. 포트폴리오에 대한 추가적인 설명\n`);
  return directory;
}

async function waitFor(condition) {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, "Folder update timed out");
    await new Promise((done) => setTimeout(done, 20));
  }
}

function moveFixtureDirectory(root, source, target) {
  assert.ok(resolve(source).startsWith(resolve(root) + sep));
  assert.ok(resolve(target).startsWith(resolve(root) + sep));
  // Copy/delete also works in Windows sandboxes that deny directory renames.
  cpSync(source, target, { recursive: true });
  rmSync(source, { recursive: true });
}

test("project and area names group arbitrary image names without a required main image", () => fixture((root) => {
  area(root, "서울 테스트 아파트", "거실", ["KakaoTalk_20261008.jpg", "10.jpg", "01.PNG", "1.jpg", "2.jpeg"]);
  area(root, "서울 테스트 아파트", "주방", ["주방 사진.JPG", "scene.webp", "detail.avif"]);
  const [entry] = readProjects(root);
  assert.equal(entry.title, "서울 테스트 아파트");
  assert.equal(entry.category, "주거공간");
  assert.deepEqual(entry.areas.map((zone) => zone.title), ["거실", "주방"]);
  assert.equal(entry.images.length, 8);
  assert.equal(entry.url, `portfolio/${encodeURIComponent("주거공간")}/${encodeURIComponent(entry.title)}/index.html`);
  assert.equal(entry.main, undefined);
  const detail = renderProject(entry);
  assert.match(detail, /8장/);
  assert.equal((detail.match(/data-project-photo /g) || []).length, 8);
  assert.doesNotMatch(detail, /대표|project-cover/);
  assert.match(detail, /href="#area-1"/);
  assert.match(detail, /id="area-2-title">주방/);
}));

test("recursive area photos preserve their paths and repeated filenames", () => fixture((root) => {
  area(root, "서울 아파트", "거실", ["사진.jpg"]);
  area(root, "서울 아파트", "주방/디테일", ["사진.jpg"]);
  const [entry] = readProjects(root);
  assert.equal(entry.images.length, 2);
  assert.deepEqual(entry.areas.map((zone) => zone.title), ["거실", "주방"]);
  assert.equal(new Set(entry.images.map((image) => image.relativePath)).size, 2);
  assert.ok(renderProject(entry).includes(`${encodeURIComponent("주방")}/${encodeURIComponent("디테일")}/${encodeURIComponent("사진.jpg")}`));
}));

test("empty, hidden, and unsupported folders or files are not published", () => fixture((root) => {
  area(root, "지역명 아파트명", "거실", ["README.md"]);
  area(root, "지역명 상가명", "홀", ["README.md"], "상업공간");
  area(root, ".draft", "거실", ["1.jpg"]);
  area(root, "다른 분류", "거실", ["1.jpg"], "기타");
  area(root, "서울 아파트", ".draft", ["1.jpg"]);
  area(root, "서울 아파트", "거실", [".private.jpg", "notes.txt"]);
  mkdirSync(join(root, "예전 프로젝트"));
  writeFileSync(join(root, "예전 프로젝트", "1.jpg"), "photo");
  assert.deepEqual(readProjects(root), []);
}));

test("commercial and residential category counts and lists stay independent", () => fixture((root) => {
  area(root, "서울 주거 테스트", "주방", ["DSC.jpg"]);
  const directory = area(root, "서울 상업 테스트", "홀", ["매장.jpg"], "상업공간");
  writeFileSync(join(dirname(directory), "project.json"), JSON.stringify({ category: "주거공간" }));
  const projects = readProjects(root);
  for (const [category, included, excluded] of [["상업공간", "서울 상업 테스트", "서울 주거 테스트"], ["주거공간", "서울 주거 테스트", "서울 상업 테스트"]]) {
    const markup = renderPortfolio(projects, category);
    assert.match(markup, /프로젝트 1개/);
    assert.ok(markup.includes(included));
    assert.ok(!markup.includes(excluded));
    assert.ok(markup.includes('aria-current="page"'));
  }
}));

test("identical project names across categories keep distinct photo URLs", () => fixture((root) => {
  area(root, "서울 동일 이름", "거실", ["사진.jpg"]);
  area(root, "서울 동일 이름", "거실", ["사진.jpg"], "상업공간");
  const projects = readProjects(root);
  assert.equal(projects.length, 2);
  assert.equal(new Set(projects.map((entry) => entry.url)).size, 2);
  const markup = renderPortfolio(projects);
  for (const entry of projects) {
    assert.ok(markup.includes(`href="${entry.url}"`));
    assert.ok(markup.includes(`src="${entry.urlBase}/${entry.previews[0].url}"`));
  }
}));

test("project, area, and photo names are escaped and URL encoded", () => fixture((root) => {
  area(root, "서울 '테스트 & 아파트'", "주방 & 다이닝", ["사진 #1 & 2.JPG"]);
  const [entry] = readProjects(root);
  const markup = renderPortfolio([entry]) + renderProject(entry);
  assert.match(markup, /테스트 &amp; 아파트/);
  assert.match(markup, /주방 &amp; 다이닝/);
  assert.match(markup, /%26/);
  assert.match(markup, /%23/);
  assert.doesNotMatch(markup, /서울 '테스트 & 아파트'/);
}));

test("build reflects area additions, renames, removals, and clears empty details", () => fixture((root) => {
  const portfolio = join(root, "portfolio");
  const directory = area(portfolio, "서울 테스트 아파트", "거실", ["DSC.jpg", "사진.jpg"]);
  const result = buildSite(root);
  assert.equal(result.pages.length, 8);
  const detailPath = join(dirname(directory), "index.html");
  const detail = readFileSync(detailPath, "utf8");
  assert.match(detail, /href="\.\.\/\.\.\/\.\.\/assets\/css\/site.css"/);
  assert.match(detail, /href="\.\.\/\.\.\/\.\.\/portfolio-residential.html"/);
  assert.match(detail, /src="\.\.\/\.\.\/\.\.\/assets\/js\/site.js"/);
  assert.match(detail, /<title>서울 테스트 아파트 \| 이림디자인<\/title>/);
  const renamed = join(dirname(directory), "거실 및 복도");
  moveFixtureDirectory(root, directory, renamed);
  const kitchen = area(portfolio, "서울 테스트 아파트", "주방", ["주방.jpg"]);
  buildSite(root);
  assert.match(readFileSync(detailPath, "utf8"), /거실 및 복도/);
  assert.match(readFileSync(join(root, "portfolio.html"), "utf8"), /2개 구역 · 사진 3장/);
  rmSync(join(kitchen, "주방.jpg"));
  buildSite(root);
  assert.doesNotMatch(readFileSync(detailPath, "utf8"), /주방/);
  rmSync(join(renamed, "DSC.jpg"));
  rmSync(join(renamed, "사진.jpg"));
  buildSite(root);
  assert.equal(existsSync(detailPath), false);
  assert.match(readFileSync(join(root, "portfolio.html"), "utf8"), /프로젝트 0개/);
}));

test("moving a project category regenerates its detail and return link", () => fixture((root) => {
  const portfolio = join(root, "portfolio");
  const oldDirectory = dirname(area(portfolio, "서울 이동 테스트", "현관", ["현관.jpg"]));
  buildSite(root);
  const newDirectory = join(portfolio, "상업공간", "서울 이동 테스트");
  mkdirSync(dirname(newDirectory), { recursive: true });
  moveFixtureDirectory(root, oldDirectory, newDirectory);
  const result = buildSite(root);
  assert.equal(result.projects[0].category, "상업공간");
  assert.match(readFileSync(join(root, "portfolio-residential.html"), "utf8"), /프로젝트 0개/);
  assert.match(readFileSync(join(root, "portfolio-commercial.html"), "utf8"), /프로젝트 1개/);
  assert.match(readFileSync(join(newDirectory, "index.html"), "utf8"), /portfolio-commercial.html/);
}));

test("legacy direct photos remain readable without numeric priority", () => fixture((root) => {
  area(root, "부산 상가", "", ["임의 사진.jpg", "2.jpg"], "상업공간");
  const [entry] = readProjects(root);
  assert.equal(entry.areas[0].title, "공간 사진");
  assert.equal(entry.images.length, 2);
  assert.deepEqual(readProjects(join(root, "missing")), []);
}));

test("custom detail HTML and existing lists are preserved on invalid input", () => fixture((root) => {
  const directory = dirname(area(join(root, "portfolio"), "서울 테스트", "거실", ["사진.jpg"]));
  writeFileSync(join(directory, "index.html"), "custom project page");
  writeFileSync(join(root, "portfolio.html"), "existing list");
  assert.throws(() => buildSite(root), /will not be overwritten/);
  assert.equal(readFileSync(join(root, "portfolio.html"), "utf8"), "existing list");
  assert.equal(readFileSync(join(directory, "index.html"), "utf8"), "custom project page");
  rmSync(join(directory, "index.html"));
  writeFileSync(join(directory, "거실", "사진.jpg"), "");
  assert.throws(() => buildSite(root), /image file is empty/);
  assert.equal(readFileSync(join(root, "portfolio.html"), "utf8"), "existing list");
}));

test("watcher automatically detects new projects, same-name replacements, and deletion", () => fixture(async (root) => {
  const results = [];
  const errors = [];
  const watcher = watchPortfolio(root, { interval: 25, onBuild: (result) => results.push(result), onError: (error) => errors.push(error) });
  try {
    assert.equal(results.length, 1);
    const directory = area(join(root, "portfolio"), "자동 반영", "주방", ["사진.jpg"]);
    await waitFor(() => results.length === 2);
    assert.match(readFileSync(join(root, "portfolio.html"), "utf8"), /자동 반영/);
    writeFileSync(join(directory, "사진.jpg"), "replaced-photo-with-a-different-size");
    await waitFor(() => results.length === 3);
    assert.equal(results.at(-1).projects[0].images[0].size, 36);
    rmSync(join(directory, "사진.jpg"));
    await waitFor(() => results.length === 4);
    assert.match(readFileSync(join(root, "portfolio.html"), "utf8"), /프로젝트 0개/);
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(results.length, 4, "Generated HTML must not trigger another build");
    assert.deepEqual(errors, []);
  } finally { watcher.close(); }
}));

test("watcher preserves the last good page on a partial copy and recovers", () => fixture(async (root) => {
  const directory = area(join(root, "portfolio"), "자동 반영", "현관", ["사진.jpg"]);
  const results = [];
  const errors = [];
  const watcher = watchPortfolio(root, { interval: 25, onBuild: (result) => results.push(result), onError: (error) => errors.push(error) });
  try {
    const previous = readFileSync(join(root, "portfolio.html"), "utf8");
    writeFileSync(join(directory, "사진.jpg"), "");
    await waitFor(() => errors.length === 1);
    assert.equal(readFileSync(join(root, "portfolio.html"), "utf8"), previous);
    writeFileSync(join(directory, "사진.jpg"), "completed-photo-copy");
    await waitFor(() => results.length === 2);
    assert.equal(results.at(-1).projects[0].images[0].size, 20);
  } finally { watcher.close(); }
}));

test("INFORMATION controls display text while folder names keep URLs and output paths", () => fixture((root) => {
  const directory = dirname(area(join(root, "portfolio"), "project-001", "거실", ["사진.jpg"]));
  const source = `# 포트폴리오 정보\n\n## 1. 아파트명과 지역\n아파트명: 꿈에그린 & 테스트\n지역: 송파구\n\n## 2. 주소\n서울시 예시 주소\n101동\n\n## 3. 포트폴리오에 대한 추가적인 설명\n밝고 편안한 공간.\n생활 동선을 고려했습니다.\n\n두 번째 문단 <script>alert(1)</script>\n`;
  writeFileSync(join(directory, "INFORMATION.md"), source);
  const { projects, pages } = buildSite(root);
  const [entry] = projects;
  assert.equal(entry.title, "꿈에그린 & 테스트");
  assert.equal(entry.folderName, "project-001");
  assert.equal(entry.region, "송파구");
  assert.equal(entry.address, "서울시 예시 주소\n101동");
  assert.match(entry.url, /\/project-001\/index.html$/);
  assert.ok(pages.includes("portfolio/주거공간/project-001/index.html"));
  const detail = readFileSync(join(directory, "index.html"), "utf8");
  const list = readFileSync(join(root, "portfolio.html"), "utf8");
  assert.match(detail, /<title>꿈에그린 &amp; 테스트 \| 이림디자인<\/title>/);
  assert.match(detail, /<dt>지역<\/dt><dd>송파구<\/dd>/);
  assert.match(detail, /서울시 예시 주소\n101동/);
  assert.match(detail, /<p>밝고 편안한 공간\.\n생활 동선을 고려했습니다\.<\/p>/);
  assert.match(detail, /두 번째 문단 &lt;script&gt;/);
  assert.doesNotMatch(detail, /<script>alert/);
  assert.match(list, /주거공간 · 송파구/);
  assert.match(list, /꿈에그린 &amp; 테스트/);
  assert.match(list, /밝고 편안한 공간/);
  assert.doesNotMatch(list, /서울시 예시 주소/);
  assert.equal(readFileSync(join(directory, "INFORMATION.md"), "utf8"), source);
}));

test("information template is generated without exposing internal folder names or empty fields", () => fixture((root) => {
  const directory = dirname(area(join(root, "portfolio"), "internal-009", "거실", ["사진.jpg"]));
  rmSync(join(directory, "INFORMATION.md"));
  const emptyDirectory = area(join(root, "portfolio"), "internal-empty", "", []);
  rmSync(join(emptyDirectory, "INFORMATION.md"));
  buildSite(root);
  assert.equal(readFileSync(join(directory, "INFORMATION.md"), "utf8"), INFORMATION_TEMPLATE);
  assert.equal(readFileSync(join(emptyDirectory, "INFORMATION.md"), "utf8"), INFORMATION_TEMPLATE);
  const detail = readFileSync(join(directory, "index.html"), "utf8");
  assert.match(detail, /<title>주거공간 프로젝트 \| 이림디자인<\/title>/);
  assert.doesNotMatch(detail, /internal-009|<dt>주소|공개할 주소|프로젝트 정보/);
  assert.equal(existsSync(join(emptyDirectory, "index.html")), false);
  buildSite(root);
  assert.equal(readFileSync(join(directory, "INFORMATION.md"), "utf8"), INFORMATION_TEMPLATE);
}));

test("information accepts unnumbered headings, Windows BOM, aliases, and ignores comments", () => fixture((root) => {
  writeFileSync(join(root, "INFORMATION.md"), "\uFEFF# 포트폴리오 정보\r\n## 아파트명과 지역\r\n- **공간명**: 테스트 매장\r\n- 지역: 부산\r\n## 주소\r\n<!-- 메모 -->\r\n테스트 주소\r\n## 포트폴리오에 대한 추가적인 설명\r\n첫 문단\r\n\r\n둘째 문단\r\n<!-- 표시하지 않는 메모 -->");
  assert.deepEqual(readProjectInformation(root), { apartmentName: "테스트 매장", region: "부산", address: "테스트 주소", description: "첫 문단\n\n둘째 문단" });
}));

test("folder moves preserve information titles independently of their new folder name", () => fixture((root) => {
  const portfolio = join(root, "portfolio");
  const source = dirname(area(portfolio, "project-old", "주방", ["사진.jpg"]));
  writeFileSync(join(source, "INFORMATION.md"), "## 1. 아파트명과 지역\n아파트명: 변하지 않는 이름\n지역: 송파구\n");
  buildSite(root);
  const target = join(portfolio, "주거공간", "project-renamed");
  moveFixtureDirectory(root, source, target);
  const { projects } = buildSite(root);
  assert.equal(projects[0].title, "변하지 않는 이름");
  assert.equal(projects[0].region, "송파구");
  assert.match(projects[0].url, /\/project-renamed\/index.html$/);
  assert.ok(existsSync(join(target, "index.html")));
  assert.equal(existsSync(source), false);
}));

test("watcher detects information-only title, region, address, description edits and removal", () => fixture(async (root) => {
  const directory = dirname(area(join(root, "portfolio"), "internal-001", "거실", ["사진.jpg"]));
  const path = join(directory, "INFORMATION.md");
  const results = [];
  const errors = [];
  const watcher = watchPortfolio(root, { interval: 25, onBuild: (result) => results.push(result), onError: (error) => errors.push(error) });
  const info = { apartmentName: "새 이름", region: "", address: "", description: "" };
  const writeInfo = () => writeFileSync(path, `## 1. 아파트명과 지역\n아파트명: ${info.apartmentName}\n지역: ${info.region}\n\n## 2. 주소\n${info.address}\n\n## 3. 포트폴리오에 대한 추가적인 설명\n${info.description}\n`);
  try {
    for (const [key, value] of [["apartmentName", "새 이름"], ["region", "새 지역"], ["address", "새 주소"], ["description", "새 설명"]]) {
      const count = results.length;
      info[key] = value;
      writeInfo();
      await waitFor(() => results.length > count);
      assert.equal(results.at(-1).projects[0][key], value);
      assert.ok(readFileSync(join(directory, "index.html"), "utf8").includes(value));
    }
    const count = results.length;
    rmSync(path);
    await waitFor(() => results.length > count);
    assert.equal(readFileSync(path, "utf8"), INFORMATION_TEMPLATE);
    assert.equal(results.at(-1).projects[0].title, "주거공간 프로젝트");
    assert.doesNotMatch(readFileSync(join(directory, "index.html"), "utf8"), /새 이름|새 주소|새 설명/);
    assert.deepEqual(errors, []);
  } finally { watcher.close(); }
}));

test("watcher creates information for new project folders before photos are added", () => fixture(async (root) => {
  const results = [];
  const errors = [];
  const watcher = watchPortfolio(root, { interval: 25, onBuild: (result) => results.push(result), onError: (error) => errors.push(error) });
  try {
    const directory = join(root, "portfolio", "상업공간", "shop-001");
    mkdirSync(directory, { recursive: true });
    await waitFor(() => results.length === 2);
    assert.equal(readFileSync(join(directory, "INFORMATION.md"), "utf8"), INFORMATION_TEMPLATE);
    assert.equal(existsSync(join(directory, "index.html")), false);
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(results.length, 2, "Generated templates must not trigger another build");
    assert.deepEqual(errors, []);
  } finally { watcher.close(); }
}));
