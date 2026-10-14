import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DETAIL_MARKER, escapeHtml, readProjectFolders, readProjects, renderPortfolio, renderProject } from "./portfolio.mjs";
import { INFORMATION_TEMPLATE } from "./information.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScIuzPk0trg4bnqM4qamHxsrbZM0e8iIzPn0qtpEdqQVyGGUQ/viewform";
const kakaoUrl = "https://map.kakao.com/link/search/" + encodeURIComponent("서울 강남구 세곡동 437-5 이림디자인");
const naverUrl = "https://map.naver.com/p/search/" + encodeURIComponent("서울 강남구 세곡동 437-5 이림디자인");
const descriptions = {
  home: "너와 내가 함께하는 공간. 당신의 취향, 물건의 쓰임새와 가치를 담는 이림디자인.",
  brand: "이림디자인 이도훈, 임상아. 미와 삶, 쓰임에 맞게 지속적으로 머물고 싶은 공간을 만듭니다.",
  portfolio: "이림디자인의 주거공간과 상업공간 포트폴리오.",
  contact: "이림디자인 상담 신청 및 프로젝트 진행과정. 전화 02-2138-1414, 이메일 irim@irimdesign.co.kr.",
  location: "이림디자인 찾아오시는 길. 서울시 강남구 세곡동 437-5, 101호. 전화 02-2138-1414.",
};
const icon = (name) => `<i class="icon xi-${name}" aria-hidden="true"></i>`;
const active = (page, section) => page === section ? ' aria-current="page"' : "";

function header(page, base = "") {
  return `<header class="site-header">
    <div class="wrap header-inner">
      <a class="logo" href="${base}index.html" aria-label="이림디자인 홈"><img src="${base}assets/images/logo.png" width="218" height="70" alt="이림디자인"></a>
      <nav class="desktop-nav" aria-label="주 메뉴">
        <ul>
          <li><a href="${base}brand-story.html"${active(page, "brand")}>BRAND STORY</a></li>
          <li><a href="${base}portfolio.html"${active(page, "portfolio")}>PORTFOLIO</a>
            <ul class="submenu"><li><a href="${base}portfolio-residential.html">주거공간</a></li><li><a href="${base}portfolio-commercial.html">상업공간</a></li></ul>
          </li>
          <li><a href="${base}contact.html"${active(page, "contact")}>CONTACT</a>
            <ul class="submenu"><li><a href="${base}contact.html">상담문의</a></li><li><a href="${base}location.html">찾아오시는 길</a></li></ul>
          </li>
        </ul>
      </nav>
      <button class="menu-toggle icon-button" type="button" aria-label="메뉴 열기" title="메뉴 열기" aria-controls="mobile-menu" aria-expanded="false">${icon("bars")}</button>
    </div>
    <nav class="mobile-menu" id="mobile-menu" aria-label="모바일 메뉴" hidden>
      <ul>
        <li><a href="${base}brand-story.html"${active(page, "brand")}>BRAND STORY</a></li>
        <li><details><summary>PORTFOLIO</summary><ul><li><a href="${base}portfolio.html">전체</a></li><li><a href="${base}portfolio-residential.html">주거공간</a></li><li><a href="${base}portfolio-commercial.html">상업공간</a></li></ul></details></li>
        <li><details><summary>CONTACT</summary><ul><li><a href="${base}contact.html">상담문의</a></li><li><a href="${base}location.html">찾아오시는 길</a></li></ul></details></li>
      </ul>
    </nav>
  </header>`;
}

function footer(base = "") {
  return `<footer class="site-footer">
    <div class="wrap footer-inner">
      <div class="footer-info">
        <h2><a href="${base}index.html">이림디자인</a></h2>
        <p><span>대표자 : 이도훈, 임상아</span><span>주소 : 서울시 강남구 세곡동 437-5, 101호 이림디자인</span></p>
        <p><span>전화 : <a href="tel:0221381414">02-2138-1414</a></span><span>E-mail : <a href="mailto:irim@irimdesign.co.kr">irim@irimdesign.co.kr</a></span></p>
      </div>
      <p class="footer-copyright">Copyright (C) 2024 이림디자인. All rights reserved.<br>Designed by&nbsp;<a href="http://twinh.co.kr" target="_blank" rel="noopener noreferrer">TwinH</a></p>
    </div>
  </footer>
  <nav class="social-links" aria-label="소셜 미디어">
    <ul>
      <li><a href="https://www.instagram.com/irimdesign/" class="instagram" target="_blank" rel="noopener noreferrer" aria-label="이림디자인 인스타그램" title="이림디자인 인스타그램">${icon("instagram")}</a></li>
      <li><a href="https://blog.naver.com/irimdesign" class="naver" target="_blank" rel="noopener noreferrer" aria-label="이림디자인 네이버 블로그" title="이림디자인 네이버 블로그">${icon("naver")}</a></li>
      <li><a href="https://www.youtube.com/@irimdesign" class="youtube" target="_blank" rel="noopener noreferrer" aria-label="이림디자인 유튜브" title="이림디자인 유튜브">${icon("youtube-play")}</a></li>
    </ul>
  </nav>`;
}

function document(page, title, content, { home = false, map = false, base = "", description = descriptions[page], detail = false } = {}) {
  return `${detail ? DETAIL_MARKER + "\n" : ""}<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(home ? "이림디자인" : `${title} | 이림디자인`)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#8b7a6c">
  <link rel="icon" type="image/svg+xml" href="${base}assets/favicon.svg">
  ${home ? '<link rel="preload" as="image" href="assets/images/main-01.jpg">\n  <link rel="stylesheet" href="assets/vendor/swiper-bundle.css">' : ""}
  <link rel="stylesheet" href="${base}assets/css/icons.css">
  <link rel="stylesheet" href="${base}assets/css/site.css">
  ${home ? '<script src="assets/vendor/swiper-bundle.min.js" defer></script>' : ""}
  <script src="${base}assets/js/site.js" defer></script>
</head>
<body class="${home ? "home" : "subpage"}">
  <a class="skip-link" href="#main">본문 바로가기</a>
  ${home ? content : `${header(page, base)}\n  <main id="main" class="sub-contents"><div class="wrap"><h1 class="sub-title">${escapeHtml(title)}</h1>\n${content}\n  </div></main>\n${footer(base)}`}
  ${map ? '<script charset="UTF-8" class="daum_roughmap_loader_script" src="https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js"></script>' : ""}
</body>
</html>
`;
}

const slides = ["01", "03", "04", "05", "06", "07", "08", "09"];
const home = `<main id="main" class="main-visual" aria-label="이림디자인">
    <div class="swiper main-slides" aria-label="이림디자인 공간 사진">
      <div class="swiper-wrapper">
        ${slides.map((slide, index) => `<div class="swiper-slide"><img src="assets/images/main-${slide}.jpg" alt="이림디자인 실내 공간 ${index + 1}" ${index === 0 ? 'fetchpriority="high"' : 'decoding="async"'}></div>`).join("\n        ")}
      </div>
    </div>
    <div class="main-text"><div class="wrap">
      <h1>이림 = 李(오얏 리) + 林(수풀 림)</h1>
      <p>너와 내가 함께하는 공간, 우리는 당신과 함께 만들어 나갑니다.<br>
      당신의 취향, 물건의 쓰임새와 가치를 고려하여, 우리의 섬세함과 세심함을 담아 냅니다.<br>
      우리는 단순 공간이 아닌 짜임있는 공간을 만드는 사람들입니다.</p>
      <a href="brand-story.html" class="main-next">NEXT</a>
    </div></div>
    <div class="slide-controls" aria-label="사진 슬라이드 제어">
      <div class="slide-progress" aria-hidden="true"><span class="slide-progress-fill"></span></div>
      <div class="slide-counter"><span class="slide-current">1</span> / 8</div>
      <button class="icon-button slide-prev" type="button" aria-label="이전 사진" title="이전 사진">${icon("angle-left")}</button>
      <button class="icon-button slide-next" type="button" aria-label="다음 사진" title="다음 사진">${icon("angle-right")}</button>
      <button class="icon-button play-toggle" type="button" aria-label="슬라이드 일시정지" title="슬라이드 일시정지" aria-pressed="false">${icon("pause")}</button>
    </div>
  </main>`;

const brand = `<section class="company" aria-label="이림디자인 소개">
    <div class="company-text"><p>
      안녕하세요.<br><strong>이림디자인 이도훈, 임상아입니다.</strong><br><br>
      글자는 획의 위치에 따라 '나'와 '너'처럼 아예 다른 단어가 되기도 하는데요.<br><br>
      우리 나라의 공간은 아파트의 형태가 많다 보니<br>
      모두 비슷한 구조에서 살아가고 있지만<br>
      다 똑같은 구조라도 사용자에 맞춰<br>
      설계와 디자인을 적용하면 글자의 획처럼 전혀 다른 공간이 됩니다.<br><br>
      <strong>이런 공간은 사용자에 따라 결정이 되고,<br>
      우리가 추구하는 '미'와 '삶', '쓰임'에 맞게 공간을 구성하였을때<br>
      비로소 지속적으로 머물고 싶은, 닮아 있는 공간이 된다고 생각합니다.<br><br>
      이러한 공간은 추억이 되어 기억속에 오래도록 남고,<br>
      현재가 되어 지속적인 행복감을 가져다 준다고 믿습니다.</strong><br><br>
      이림은 이런 공간을 위해 노력하고 연구합니다.
    </p></div>
    <div class="company-image"><img src="assets/images/brand.jpg" alt="이림디자인 이도훈, 임상아 대표" width="640" height="560" fetchpriority="high"></div>
  </section>`;

const contact = `<section class="contact-section" aria-label="상담문의 및 프로젝트 진행과정">
    <div class="contact-intro">
      <h2>이림디자인</h2>
      <p>공간은 사용자에 따라 결정이 되고, 우리가 추구하는 '미'와 '삶', '쓰임'에 맞게 공간을 구성하였을때 비로소 지속적으로 머물고 싶은, 닮아 있는 공간이 된다고 생각합니다.<br><br>
      <strong>이러한 공간은 추억이 되어 기억속에 오래도록 남고,<br>현재가 되어 지속적인 행복감을 가져다 준다고 믿습니다.</strong><br><br>
      이림은 이런 공간을 위해 노력하고 연구합니다.</p>
      <ul class="contact-info">
        <li>전화 : <a href="tel:0221381414">02-2138-1414</a></li>
        <li>E-mail : <a href="mailto:irim@irimdesign.co.kr">irim@irimdesign.co.kr</a></li>
        <li>주소 : 서울시 강남구 세곡동 437-5, 101호 이림디자인</li>
      </ul>
      <p>문의남겨주시면 빠른 시일 내에 답변 드리겠습니다.</p>
      <div class="contact-actions"><a class="text-link" href="${formUrl}" target="_blank" rel="noopener noreferrer">상담신청서</a><a class="text-link" href="mailto:irim@irimdesign.co.kr?subject=${encodeURIComponent("이림디자인 상담문의")}">이메일 문의</a></div>
    </div>
    <h2>이림디자인 프로젝트 진행과정</h2>
    <h3>1. 상담 신청</h3>
    <ul class="process-list">
      <li>상담에 필요한 기본정보를 기입하는 <a class="application-link" href="${formUrl}" target="_blank" rel="noopener noreferrer">상담신청서</a>입니다.</li>
      <li>신청서 작성 후 제출을 해주시면 평일 기준 3~4일 이내 순차적으로 안내 전화드립니다.</li>
      <li>간단한 전화 상담 이후 1차 사무실 상담이 진행되며, 1차 사무실 상담 후 이를 기반으로 한 예상 견적서를 전달드립니다.</li>
      <li>예상 견적서의 경우 이림디자인의 데이터 기반으로 작성되며, 공간의 실제 컨디션, 마감재, 구조 변경 등 공사 범위에 따라 달라질 수 있습니다.</li>
    </ul>
    <h3>2. 가계약</h3>
    <ul class="process-list"><li>디자인및 설계 작업을 위한 소정의 가계약금이 발생하게 됩니다.</li><li>가계약금은 최종 계약시 본계약금에서 제외해드립니다.</li></ul>
    <h3>3. 실측</h3>
    <ul class="process-list"><li>담당 디자이너와 현장 소장이 현장을 방문하여 정확한 실측 및 현장 상황을 면밀히 파악합니다.</li></ul>
    <h3>4. 디자인 미팅</h3>
    <ul class="process-list"><li>현장 실측 후 구체적인 디자인 미팅이 진행되고 있습니다.<p>1차 레이아웃 미팅, 2차 마감재 미팅, 3차 최종 브리핑및 본 계약이 진행되며, 프로젝트 사이즈에 따라 미팅 기간은 달라질 수 있습니다.</p></li></ul>
    <h3>5. 공사준비및 진행</h3>
    <ul class="process-list"><li>공사 시작 3주전에 모든 디자인 계획이 마감됩니다.</li><li>고객님과 협의한 디자인 내용으로 도면 작업이 이뤄지며, 전체 일정표를 공유드립니다.</li><li>결정된 디자인 도면으로 현장 소장의 감리 아래 철거부터 최종 마감까지 모든 작업이 이루어집니다.</li></ul>
    <h3>6. 마무리및 AS</h3>
    <ul class="process-list"><li>문제가 발생하지 않도록 최선을 다하고 있으며, 하자보증기간은 1년입니다.</li><li>공사 완료 후 문제 발생 시 신속한 AS관리를 약속드립니다.</li></ul>
  </section>`;

const location = `<section aria-label="찾아오시는 길">
    <div class="location-map">
      <div class="map-fallback"><strong>이림디자인</strong><p>서울시 강남구 세곡동 437-5, 101호</p><a href="${kakaoUrl}" class="text-link" target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a></div>
      <div id="daumRoughmapContainer1752652283558" class="root_daum_roughmap root_daum_roughmap_landing" hidden></div>
    </div>
    <dl class="location-info">
      <div><dt>주소</dt><dd>서울시 강남구 세곡동 437-5, 101호 이림디자인</dd></div>
      <div><dt>전화</dt><dd><a href="tel:0221381414">02-2138-1414</a></dd></div>
      <div><dt>E-mail</dt><dd><a href="mailto:irim@irimdesign.co.kr">irim@irimdesign.co.kr</a></dd></div>
    </dl>
    <div class="map-links"><a href="${kakaoUrl}" class="text-link" target="_blank" rel="noopener noreferrer">카카오맵</a><a href="${naverUrl}" class="text-link" target="_blank" rel="noopener noreferrer">네이버 지도</a></div>
  </section>`;

export function buildSite(outputRoot = root) {
  const portfolioRoot = resolve(outputRoot, "portfolio");
  const projects = readProjects(portfolioRoot);
  // Supply an editable template for each new project without overwriting notes.
  for (const { directory } of readProjectFolders(portfolioRoot)) {
    const informationPath = resolve(directory, "INFORMATION.md");
    if (!existsSync(informationPath)) writeFileSync(informationPath, INFORMATION_TEMPLATE, { encoding: "utf8", flag: "wx" });
  }
  const pages = [
    ["index.html", document("home", "이림디자인", home, { home: true })],
    ["brand-story.html", document("brand", "BRAND STORY", brand)],
    ["portfolio.html", document("portfolio", "PORTFOLIO", renderPortfolio(projects))],
    ["portfolio-residential.html", document("portfolio", "PORTFOLIO", renderPortfolio(projects, "주거공간"))],
    ["portfolio-commercial.html", document("portfolio", "PORTFOLIO", renderPortfolio(projects, "상업공간"))],
    ["contact.html", document("contact", "CONTACT", contact)],
    ["location.html", document("location", "LOCATION", location, { map: true })],
  ];
  for (const project of projects) {
    pages.push([`portfolio/${project.category}/${project.folderName}/index.html`, document("portfolio", project.title, renderProject(project), {
      base: "../../../",
      detail: true,
      description: `${project.title} | 이림디자인 ${project.category} 포트폴리오.${project.region ? ` ${project.region}.` : ""} ${project.description ? project.description.replace(/\s+/g, " ").slice(0, 160) : `${project.areas.map((area) => area.title).join(", ")} 구역별 리모델링 사진.`}`,
    })]);
  }
  for (const [filename, html] of pages) {
    writeFileSync(resolve(outputRoot, filename), html.replace(/[ \t]+$/gm, ""), "utf8");
    console.log(`Generated ${filename}`);
  }
  // Remove only our generated detail when all photos were removed from a project.
  const activeDirectories = new Set(projects.map((project) => project.directory));
  for (const { directory } of readProjectFolders(portfolioRoot)) {
    const detailPath = resolve(directory, "index.html");
    if (!activeDirectories.has(directory) && existsSync(detailPath) && readFileSync(detailPath, "utf8").startsWith(DETAIL_MARKER)) {
      unlinkSync(detailPath);
    }
  }
  console.log(`Portfolio: ${projects.length} project(s).`);
  return { pages: pages.map(([filename]) => filename), projects };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { buildSite(); }
  catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
