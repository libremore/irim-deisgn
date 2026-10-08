import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

export const DETAIL_MARKER = "<!-- Generated portfolio detail by scripts/build.mjs -->";
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const categories = new Set(["주거공간", "상업공간"]);
const collator = new Intl.Collator("ko", { numeric: true });

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function readProjectFolders(portfolioRoot) {
  if (!existsSync(portfolioRoot)) return [];
  const folders = [];
  for (const category of readdirSync(portfolioRoot, { withFileTypes: true })) {
    if (!category.isDirectory() || !categories.has(category.name)) continue;
    const categoryRoot = join(portfolioRoot, category.name);
    for (const folder of readdirSync(categoryRoot, { withFileTypes: true })) {
      if (!folder.isDirectory() || folder.name.startsWith(".")) continue;
      folders.push({ title: folder.name, category: category.name, directory: join(categoryRoot, folder.name) });
    }
  }
  return folders;
}

export function readProjects(portfolioRoot) {
  const projects = [];
  for (const { title, category, directory } of readProjectFolders(portfolioRoot)) {
    const label = `${category}/${title}`;
    const files = readdirSync(directory, { withFileTypes: true });
    const images = [];
    const seenNumbers = new Set();
    for (const file of files) {
      if (!file.isFile() || !extensions.has(extname(file.name).toLowerCase())) continue;
      const match = /^(\d+)\.(jpe?g|png|webp|avif)$/i.exec(file.name);
      const number = match ? Number(match[1]) : NaN;
      if (!Number.isSafeInteger(number) || number < 1) {
        throw new Error(`${label}/${file.name}: use a positive numbered filename such as 1.jpg or 2.png.`);
      }
      if (seenNumbers.has(number)) {
        throw new Error(`${label}: image number ${number} is duplicated. Keep one image for each number.`);
      }
      if (statSync(join(directory, file.name)).size === 0) {
        throw new Error(`${label}/${file.name}: image file is empty.`);
      }
      seenNumbers.add(number);
      images.push({ number, filename: file.name, url: encodeURIComponent(file.name) });
    }
    if (!images.length) continue;
    if (!seenNumbers.has(1)) {
      throw new Error(`${label}: main image 1.jpg (or another supported extension) is required.`);
    }
    images.sort((left, right) => left.number - right.number);
    const detailPath = join(directory, "index.html");
    if (existsSync(detailPath) && !readFileSync(detailPath, "utf8").startsWith(DETAIL_MARKER)) {
      throw new Error(`${label}/index.html: existing custom HTML will not be overwritten. Rename it before building.`);
    }
    const urlBase = `portfolio/${encodeURIComponent(category)}/${encodeURIComponent(title)}`;
    projects.push({
      title,
      category,
      directory,
      detailPath,
      urlBase,
      url: `${urlBase}/index.html`,
      main: images[0],
      details: images.slice(1),
      images,
    });
  }
  return projects.sort((left, right) => collator.compare(left.title, right.title) || collator.compare(left.category, right.category));
}

export function renderPortfolio(projects, category = "전체") {
  const selected = category === "전체" ? projects : projects.filter((project) => project.category === category);
  const filters = [["전체", "portfolio.html"], ["주거공간", "portfolio-residential.html"], ["상업공간", "portfolio-commercial.html"]];
  return `<section aria-label="${escapeHtml(category)} 포트폴리오">
    <nav class="portfolio-filters" aria-label="포트폴리오 분류">${filters.map(([label, url]) => `<a href="${url}"${label === category ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
    <p class="portfolio-total">Total ${selected.length}건</p>
    ${selected.length ? `<ul class="portfolio-grid">${selected.map((project) => `<li>
      <a class="portfolio-item" href="${escapeHtml(project.url)}">
        <img src="${escapeHtml(`${project.urlBase}/${project.main.url}`)}" alt="${escapeHtml(project.title)} 대표 사진" loading="lazy" decoding="async">
        <span class="portfolio-category">${escapeHtml(project.category)}</span>
        <h2>${escapeHtml(project.title)}</h2>
      </a>
    </li>`).join("\n")}</ul>` : '<p class="portfolio-empty">게시물이 없습니다.</p>'}
  </section>`;
}

export function renderProject(project) {
  const photo = (image, primary = false) => `<figure class="project-photo${primary ? " project-cover" : ""}">
      <a href="${escapeHtml(image.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} ${primary ? "대표" : `${image.number}번 상세`} 사진 원본 보기">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(project.title)} ${primary ? "대표 사진" : `상세 사진 ${image.number}`}" ${primary ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>
      </a>
    </figure>`;
  return `<article class="project-detail">
    <div class="project-heading"><p class="portfolio-category">${escapeHtml(project.category)}</p><a class="text-link" href="../../../portfolio.html">목록으로</a></div>
    ${photo(project.main, true)}
    ${project.details.length ? `<div class="project-gallery" aria-label="${escapeHtml(project.title)} 상세 사진">${project.details.map((image) => photo(image)).join("\n")}</div>` : ""}
    <div class="project-return"><a class="text-link" href="../../../portfolio.html">목록으로</a></div>
  </article>`;
}
