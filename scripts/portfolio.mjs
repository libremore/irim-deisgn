import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { readProjectInformation } from "./information.mjs";

export const DETAIL_MARKER = "<!-- Generated portfolio detail by scripts/build.mjs -->";
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const categories = new Set(["주거공간", "상업공간"]);
// A stable display order only: filenames do not assign a cover or photo priority.
const collator = new Intl.Collator("ko", { numeric: false });
const compareNames = (left, right) => collator.compare(left.name, right.name) || left.name.localeCompare(right.name, "en");
const entries = (directory) => readdirSync(directory, { withFileTypes: true }).filter((entry) => !entry.name.startsWith(".")).sort(compareNames);
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const categoryPage = (category) => category === "주거공간" ? "portfolio-residential.html" : "portfolio-commercial.html";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function readProjectFolders(portfolioRoot) {
  if (!existsSync(portfolioRoot)) return [];
  const folders = [];
  for (const category of entries(portfolioRoot)) {
    if (!category.isDirectory() || !categories.has(category.name)) continue;
    const categoryRoot = join(portfolioRoot, category.name);
    for (const folder of entries(categoryRoot)) {
      if (!folder.isDirectory()) continue;
      folders.push({ folderName: folder.name, category: category.name, directory: join(categoryRoot, folder.name) });
    }
  }
  return folders;
}

function readImages(directory, prefix, label, recursive = true) {
  const images = [];
  for (const file of entries(directory)) {
    const relativePath = prefix ? `${prefix}/${file.name}` : file.name;
    if (recursive && file.isDirectory()) {
      images.push(...readImages(join(directory, file.name), relativePath, label));
    } else if (file.isFile() && extensions.has(extname(file.name).toLowerCase())) {
      const { size, mtimeMs } = statSync(join(directory, file.name));
      if (!size) throw new Error(`${label}/${relativePath}: image file is empty.`);
      images.push({ filename: file.name, relativePath, url: encodePath(relativePath), size, mtimeMs });
    }
  }
  return images;
}

export function readProjects(portfolioRoot) {
  const projects = [];
  for (const { folderName, category, directory } of readProjectFolders(portfolioRoot)) {
    const label = `${category}/${folderName}`;
    const areas = [];
    for (const folder of entries(directory)) {
      if (!folder.isDirectory()) continue;
      const images = readImages(join(directory, folder.name), folder.name, label);
      if (images.length) areas.push({ title: folder.name, images });
    }
    // Keep older projects readable while their photos are moved into area folders.
    const ungrouped = readImages(directory, "", label, false);
    if (ungrouped.length) areas.push({ title: "공간 사진", images: ungrouped });
    if (!areas.length) continue;
    areas.forEach((area, index) => { area.id = `area-${index + 1}`; });
    const images = areas.flatMap((area) => area.images);
    const detailPath = join(directory, "index.html");
    if (existsSync(detailPath) && !readFileSync(detailPath, "utf8").startsWith(DETAIL_MARKER)) {
      throw new Error(`${label}/index.html: existing custom HTML will not be overwritten. Rename it before building.`);
    }
    const information = readProjectInformation(directory);
    const title = information.apartmentName || `${category} 프로젝트`;
    const urlBase = encodePath(`portfolio/${category}/${folderName}`);
    // Show different areas side by side; no single photo is designated as primary.
    const previews = [];
    for (let index = 0; index < images.length && previews.length < 3; index++) {
      for (const area of areas) {
        if (area.images[index]) previews.push({ ...area.images[index], area: area.title });
        if (previews.length === 3) break;
      }
    }
    projects.push({ title, folderName, ...information, category, directory, detailPath, urlBase, url: `${urlBase}/index.html`, areas, images, previews });
  }
  return projects.sort((left, right) => collator.compare(left.title, right.title) || collator.compare(left.category, right.category));
}

export function renderPortfolio(projects, category = "전체") {
  const selected = category === "전체" ? projects : projects.filter((project) => project.category === category);
  const filters = [["전체", "portfolio.html"], ["주거공간", "portfolio-residential.html"], ["상업공간", "portfolio-commercial.html"]];
  return `<section class="portfolio-section" aria-label="${escapeHtml(category)} 포트폴리오">
    <div class="portfolio-intro"><p class="portfolio-eyebrow">SPACES BY IRIM</p><h2>공간에 담은 일상의 변화</h2><p>주거공간과 상업공간, 각 프로젝트의 구역별 모습을 만나보세요.</p></div>
    <div class="portfolio-toolbar"><nav class="portfolio-filters" aria-label="포트폴리오 분류">${filters.map(([label, url]) => `<a href="${url}"${label === category ? ' aria-current="page"' : ""}>${label}<span>${label === "전체" ? projects.length : projects.filter((project) => project.category === label).length}</span></a>`).join("")}</nav><p class="portfolio-total">프로젝트 ${selected.length}개</p></div>
    ${selected.length ? `<ul class="portfolio-grid${selected.length === 1 ? " portfolio-grid-single" : ""}">${selected.map((project) => `<li>
      <a class="portfolio-item" href="${escapeHtml(project.url)}">
        <div class="portfolio-previews" style="--preview-count: ${project.previews.length}">${project.previews.map((image) => `<div class="portfolio-preview"><img src="${escapeHtml(`${project.urlBase}/${image.url}`)}" alt="${escapeHtml(`${project.title} · ${image.area}`)}" loading="lazy" decoding="async"><span>${escapeHtml(image.area)}</span></div>`).join("")}</div>
        <div class="portfolio-item-info"><div><span class="portfolio-category">${escapeHtml(project.category)}${project.region ? ` · ${escapeHtml(project.region)}` : ""}</span><h2>${escapeHtml(project.title)}</h2><p class="portfolio-area-list">${project.areas.map((area) => escapeHtml(area.title)).join(" · ")}</p>${project.description ? `<p class="portfolio-description">${escapeHtml(project.description.split(/\n\s*\n/)[0].replace(/\n/g, " "))}</p>` : ""}</div><span class="portfolio-item-meta">${project.areas.length}개 구역 · 사진 ${project.images.length}장<span class="portfolio-view">프로젝트 보기 <span aria-hidden="true">↗</span></span></span></div>
      </a>
    </li>`).join("\n")}</ul>` : `<div class="portfolio-empty"><h2>${category === "전체" ? "새로운 공간을 준비하고 있습니다." : `${escapeHtml(category)} 프로젝트를 준비하고 있습니다.`}</h2><p>완성된 프로젝트는 이곳에서 만나보실 수 있습니다.</p>${category !== "전체" ? '<a class="text-link" href="portfolio.html">전체 포트폴리오 보기</a>' : ""}</div>`}
  </section>`;
}

export function renderProject(project) {
  const listUrl = `../../../${categoryPage(project.category)}`;
  return `<article class="project-detail">
    <div class="project-heading"><div><p class="portfolio-category">${escapeHtml(project.category)}</p><p class="project-summary">${project.areas.length}개 구역 · 사진 ${project.images.length}장</p></div><a class="text-link" href="${listUrl}">포트폴리오 목록</a></div>
    ${project.region || project.address || project.description ? `<section class="project-information" aria-label="프로젝트 정보">${project.region || project.address ? `<dl class="project-facts">${project.region ? `<div><dt>지역</dt><dd>${escapeHtml(project.region)}</dd></div>` : ""}${project.address ? `<div><dt>주소</dt><dd>${escapeHtml(project.address)}</dd></div>` : ""}</dl>` : ""}${project.description ? `<div class="project-description"><h2>공간 이야기</h2>${project.description.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n")}</div>` : ""}</section>` : ""}
    <nav class="project-area-nav" aria-label="리모델링 구역 바로가기">${project.areas.map((area) => `<a href="#${area.id}">${escapeHtml(area.title)}<span>${area.images.length}</span></a>`).join("")}</nav>
    <div class="project-areas">${project.areas.map((area) => `<section class="project-area" id="${area.id}" aria-labelledby="${area.id}-title">
      <div class="project-area-heading"><h2 id="${area.id}-title">${escapeHtml(area.title)}</h2><p>사진 ${area.images.length}장</p></div>
      <div class="project-gallery">${area.images.map((image, index) => `<figure class="project-photo">
        <a href="${escapeHtml(image.url)}" target="_blank" rel="noopener noreferrer" data-project-photo data-caption="${escapeHtml(`${project.title} · ${area.title} · ${index + 1} / ${area.images.length}`)}" aria-label="${escapeHtml(`${area.title} 사진 ${index + 1} 크게 보기`)}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(`${project.title} · ${area.title} 사진 ${index + 1}`)}" loading="lazy" decoding="async"></a>
      </figure>`).join("\n")}</div>
    </section>`).join("\n")}</div>
    <div class="project-return"><a class="text-link" href="${listUrl}">포트폴리오 목록</a><a class="text-link" href="../../../contact.html">상담문의</a></div>
    <dialog class="photo-dialog" aria-label="포트폴리오 사진 크게 보기"><div class="photo-dialog-toolbar"><p id="photo-caption" aria-live="polite"></p><button class="photo-close" type="button" aria-label="사진 닫기">닫기 <span aria-hidden="true">×</span></button></div><div class="photo-dialog-view"><button class="photo-prev" type="button" aria-label="이전 사진">‹</button><img class="photo-dialog-image" alt="선택한 포트폴리오 사진" aria-describedby="photo-caption"><button class="photo-next" type="button" aria-label="다음 사진">›</button></div><a class="photo-original text-link" target="_blank" rel="noopener noreferrer">원본 사진 보기</a></dialog>
  </article>`;
}
