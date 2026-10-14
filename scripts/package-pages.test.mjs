import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { buildSite } from "./build.mjs";
import { packagePages } from "./package-pages.mjs";

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "irim-pages-test-"));
  try {
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "assets", "site.css"), "body { color: black; }");
    writeFileSync(join(root, ".nojekyll"), "");
    run(root);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("irim-pages-test-"));
    rmSync(root, { recursive: true, force: true });
  }
}

test("Pages artifact includes site files but excludes management files", () => fixture((root) => {
  for (const category of ["주거공간", "상업공간"]) {
    const directory = join(root, "portfolio", category, "서울 테스트 공간");
    mkdirSync(directory, { recursive: true });
    mkdirSync(join(directory, "거실"));
    mkdirSync(join(directory, "주방", "디테일"), { recursive: true });
    writeFileSync(join(directory, "거실", "KakaoTalk.jpg"), "living-photo");
    writeFileSync(join(directory, "주방", "디테일", "KakaoTalk.jpg"), "kitchen-photo");
    writeFileSync(join(directory, "거실", "README.md"), "area management note");
    writeFileSync(join(directory, "README.md"), "private management note");
    writeFileSync(join(directory, "project.json"), "{}");
    writeFileSync(join(directory, "INFORMATION.md"), "## 1. 아파트명과 지역\n아파트명: 폴더와 다른 표시 이름\n지역: 테스트 지역\n\n## 2. 주소\n테스트 주소\n\n## 3. 포트폴리오에 대한 추가적인 설명\n테스트 설명\n");
  }
  for (const filename of ["README.md", "ANALYSIS.md", "verification.json", "update-portfolio.cmd", "publish-portfolio.cmd"]) writeFileSync(join(root, filename), "management file");
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, ".github"));
  buildSite(root);
  const output = packagePages(root);
  assert.equal(readFileSync(join(output, "assets", "site.css"), "utf8"), "body { color: black; }");
  assert.ok(existsSync(join(output, "index.html")));
  assert.ok(existsSync(join(output, ".nojekyll")));
  for (const category of ["주거공간", "상업공간"]) {
    const directory = join(output, "portfolio", category, "서울 테스트 공간");
    assert.ok(existsSync(join(directory, "index.html")));
    assert.equal(readFileSync(join(directory, "거실", "KakaoTalk.jpg"), "utf8"), "living-photo");
    assert.equal(readFileSync(join(directory, "주방", "디테일", "KakaoTalk.jpg"), "utf8"), "kitchen-photo");
    assert.equal(existsSync(join(directory, "거실", "README.md")), false);
    assert.equal(existsSync(join(directory, "README.md")), false);
    assert.equal(existsSync(join(directory, "project.json")), false);
    assert.equal(existsSync(join(directory, "INFORMATION.md")), false);
    assert.match(readFileSync(join(directory, "index.html"), "utf8"), /폴더와 다른 표시 이름/);
    assert.match(readFileSync(join(directory, "index.html"), "utf8"), /테스트 주소/);
  }
  for (const filename of ["README.md", "ANALYSIS.md", "verification.json", "update-portfolio.cmd", "publish-portfolio.cmd", "scripts", ".github"]) assert.equal(existsSync(join(output, filename)), false);
}));

test("repackaging removes stale projects from generated output only", () => fixture((root) => {
  const directory = join(root, "portfolio", "주거공간", "서울 테스트 아파트");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "1.jpg"), "photo");
  writeFileSync(join(directory, "README.md"), "keep source note");
  buildSite(root);
  const output = packagePages(root);
  assert.ok(existsSync(join(output, "portfolio", "주거공간", "서울 테스트 아파트", "index.html")));
  rmSync(join(directory, "1.jpg"));
  buildSite(root);
  packagePages(root);
  assert.equal(existsSync(join(output, "portfolio")), false);
  assert.equal(readFileSync(join(directory, "README.md"), "utf8"), "keep source note");
}));

test("missing site files fail before replacing the previous artifact", () => fixture((root) => {
  buildSite(root);
  const output = packagePages(root);
  writeFileSync(join(output, "index.html"), "previous artifact");
  rmSync(join(root, "index.html"));
  assert.throws(() => packagePages(root), /ENOENT/);
  assert.equal(readFileSync(join(output, "index.html"), "utf8"), "previous artifact");
}));
