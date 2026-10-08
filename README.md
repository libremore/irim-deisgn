# 이림디자인 정적 사이트

원본 https://www.irimdesign.co.kr/ 를 분석해 제작한 HTML/CSS/JavaScript 사이트입니다.

`index.html`을 브라우저에서 열면 됩니다. 패키지 설치, PHP, 데이터베이스, 빌드 서버는 필요하지 않습니다. 페이지, 사진, 로고, 배경, 글꼴, 슬라이드 라이브러리는 모두 현재 폴더에 저장되어 있습니다.

## 페이지

| 파일 | 내용 |
| --- | --- |
| `index.html` | 원본 공간 사진 8장의 자동 슬라이드, 소개 문구, NEXT |
| `brand-story.html` | 브랜드 소개, 대표 사진 |
| `portfolio.html` | 전체 포트폴리오 |
| `portfolio-residential.html` | 주거공간 포트폴리오 |
| `portfolio-commercial.html` | 상업공간 포트폴리오 |
| `contact.html` | 상담신청서, 연락처, 프로젝트 진행과정 |
| `location.html` | 카카오 지도, 주소, 전화, 이메일 |

포트폴리오는 `portfolio` 폴더에 넣은 사진으로 관리합니다. 현재 사진이 없는 예시 폴더만 있어 목록은 비어 있습니다.

## 포트폴리오 관리

```text
portfolio/
  주거공간/
    지역명 아파트명/
      1.jpg
      2.jpg
      3.jpg
  상업공간/
    지역명 상가명/
      1.jpg
      2.jpg
```

각 분류 아래의 프로젝트 폴더명이 사이트에 표시되는 제목입니다. `1`번은 대표 사진, 나머지는 번호순 서브·디테일 사진입니다. JPG/JPEG/PNG/WebP/AVIF를 지원합니다.

사진을 추가하거나 수정한 후 **`update-portfolio.cmd`를 실행**하면 목록과 상세 HTML이 생성됩니다. 터미널에서는 `node scripts/build.mjs`로 동일하게 업데이트할 수 있습니다. 사이트를 보는 데는 Node.js가 필요 없으며, 폴더의 변경을 반영할 때만 사용합니다.

분류는 `주거공간`과 `상업공간` 폴더 위치로 자동 결정되며, 별도 `project.json` 설정은 필요 없습니다. 기존 프로젝트 폴더는 해당 분류 폴더 안으로 옮긴 뒤 업데이트합니다. 파일명 규칙은 `portfolio/README.md`에 정리했습니다.

## GitHub Pages

`.github/workflows/pages.yml`에 자동 배포 설정을 준비했습니다. GitHub 저장소에서 **Settings > Pages > Source > GitHub Actions**를 선택한 뒤 `main`에 파일을 업로드하면 테스트와 정적 사이트 생성을 거쳐 배포합니다. 사진만 추가해도 포트폴리오 목록과 상세 페이지가 자동 갱신됩니다.

실제 저장소 생성·업로드와 Pages 설정은 별도로 필요합니다. 처음 배포 방법과 오류 확인은 [GITHUB_PAGES.md](GITHUB_PAGES.md)에 정리했습니다. 배포 대상은 `_site`에 모으며 관리 문서와 스크립트는 사이트 파일에서 제외됩니다. 공개 저장소에서는 이 소스 파일들도 GitHub를 통해 공개됩니다.

## 온라인 기능

카카오 지도와 지도 바로가기, 원본 Google 상담신청서, 소셜 미디어 링크에는 인터넷 연결이 필요합니다. 지도를 불러오지 못해도 주소와 연락처가 표시됩니다. 이메일 문의는 사용자의 이메일 앱을 열며, 이 정적 사이트가 문의를 직접 수신하거나 저장하지 않습니다.

## 수정

- 스타일: `assets/css/site.css`
- 메뉴, 슬라이드 동작, 지도 표시: `assets/js/site.js`
- 이미지: `assets/images/`
- 공통 메뉴, 푸터, 페이지 콘텐츠: `scripts/build.mjs`
- 포트폴리오 폴더 읽기 및 목록·상세 렌더링: `scripts/portfolio.mjs`
- GitHub Pages 배포 패키징: `scripts/package-pages.mjs`

HTML 파일을 직접 편집해 사용할 수 있습니다. 공통 템플릿에서 여러 페이지를 다시 생성하려면 Node.js로 아래 명령을 실행합니다. **재생성하면 HTML 파일의 직접 수정 내용이 덮어써집니다.**

```powershell
node scripts/build.mjs
```

선택 사항인 로컬 미리보기는 다음 명령으로 실행합니다. 표시되는 주소를 열고 종료할 때 Ctrl+C를 누릅니다. 기본 포트가 사용 중이면 다른 포트를 선택합니다. 이 서버는 현재 사이트의 공개 HTML과 정적 자산만 제공합니다.

```powershell
node scripts/preview.mjs
```

파일 참조와 자산 검사는 Python 표준 라이브러리만 사용합니다. 결과는 `verification.json`에 기록됩니다.

```powershell
python scripts/verify.py
```

필요한 자산을 다시 내려받을 때는 `scripts/download-assets.ps1`을 사용합니다. 이미 존재하는 파일은 건너뜁니다.

## 분석 및 검증

원본 화면 구성, 정적 변환 범위와 차이점은 `ANALYSIS.md`에 정리했습니다. 브라우저에서 메인 사진의 전환·일시정지, NEXT 이동, 모바일 메뉴와 하위 메뉴, Escape 닫기, 데스크톱·모바일 레이아웃, 이미지 로딩을 점검했습니다.
