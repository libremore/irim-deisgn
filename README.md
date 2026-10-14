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

포트폴리오는 `portfolio` 폴더에 넣은 사진과 각 프로젝트의 `INFORMATION.md`로 관리합니다. 분류 → 프로젝트 폴더 → 리모델링 구역 구조를 자동으로 읽어 목록과 구역별 상세 갤러리를 생성합니다.

## 포트폴리오 관리

```text
portfolio/
  주거공간/
    project-001/
      INFORMATION.md
      거실/
        거실 사진.jpg
        KakaoTalk_20261008.jpg
      주방/
        IMG_0001.jpg
  상업공간/
    shop-001/
      INFORMATION.md
      홀/
        매장 사진.jpg
      카운터/
        카운터 사진.jpg
```

각 분류 아래의 프로젝트 폴더명은 자유롭게 정합니다. 화면에 표시되는 아파트명(상업공간은 상가·매장명), 지역, 주소, 추가 설명은 해당 폴더의 `INFORMATION.md`에 작성합니다. 기본 양식은 `portfolio/INFORMATION.template.md`이며, 업데이트 시 파일이 없는 프로젝트에는 빈 양식을 자동 생성합니다. 작성한 파일은 덮어쓰지 않습니다. 이름이 비어 있으면 분류별 기본 제목을 사용하며, 빈 주소·설명은 표시하지 않습니다. 상세의 제목·지역·주소·설명과 목록의 이름·지역·설명 요약에 반영됩니다.

프로젝트 내부의 하위 폴더명은 리모델링 구역입니다. 사진 파일명에 우선순위가 없고 `1.jpg`도 필요하지 않습니다. JPG/JPEG/PNG/WebP/AVIF를 지원합니다. 목록은 여러 구역 사진을 나란히 보여주며, 상세는 구역 바로가기와 동등한 크기의 사진 갤러리, 확대 보기를 제공합니다.

사진을 추가하거나 수정한 후 **`update-portfolio.cmd`를 실행**하면 목록과 상세 HTML이 생성됩니다. 터미널에서는 `node scripts/build.mjs`로 동일하게 업데이트할 수 있습니다. 사이트를 보는 데는 Node.js가 필요 없으며, 폴더의 변경을 반영할 때만 사용합니다.

**`preview-portfolio.cmd`를 실행**하거나 `node scripts/preview.mjs`로 미리보기를 시작하면, 창이 열려 있는 동안 폴더·사진·`INFORMATION.md` 변경을 자동 감지하여 HTML을 다시 생성합니다. 표시된 주소를 열고 변경 후 브라우저를 새로고침하세요. 미리보기가 이미 실행 중이라면 생성 스크립트를 수정한 뒤 한 번 재시작하세요. GitHub Pages에서는 `main`에 변경을 업로드하면 배포 과정에서 자동 반영됩니다.

분류는 `주거공간`과 `상업공간` 폴더 위치로 자동 결정되며, 별도 `project.json` 설정은 필요 없습니다. 기존 프로젝트 폴더는 해당 분류 폴더 안으로 옮긴 뒤 구역 폴더에 사진을 넣습니다. 자세한 구조는 `portfolio/README.md`에 정리했습니다.

## GitHub Pages

**한 번에 업데이트·배포:** 프로젝트 최상위의 **`publish-portfolio.cmd`를 더블클릭**하면 아래 작업을 순서대로 진행합니다.

1. 원격 `main`의 변경 사항 확인
2. 테스트, 포트폴리오 생성, 원본 링크·사진 검사, 배포 패키지 생성·검사
3. 현재 저장소의 수정·추가·삭제된 파일 전체를 커밋하고 `origin/main`에 push
4. 해당 커밋의 GitHub Pages 워크플로와 `deploy` 작업 성공 확인
5. 실제 포트폴리오 페이지의 배포 버전 확인 후 사이트 주소 출력

Node.js, Git, Python 3.9 이상이 필요합니다. `main` 브랜치에서 실행합니다. 검사 실패나 충돌이 있으면 업로드 전에 중단하며, 변경이 없으면 새 커밋을 만들지 않습니다. 이미 만든 미업로드 커밋은 함께 업로드합니다. `_site`, 검사 결과, `.env` 등 `.gitignore`에 지정한 파일은 커밋하지 않습니다. 이 스크립트는 포트폴리오 사진뿐 아니라 사이트 코드와 안내 문서 등 저장소의 모든 수정 사항을 함께 업로드합니다.

GitHub 인증이 없거나 만료되면 실행 창에서 공식 Git Credential Manager의 로그인 주소·코드를 안내합니다. 인증을 완료하면 같은 실행에서 이어서 업로드합니다. Git Credential Manager가 없는 환경에서는 Git의 로그인 설정을 먼저 완료해야 합니다. 실행 창에 오류가 표시되면 원인을 수정하고 다시 실행하세요. 기존 커밋을 다시 만들거나 강제 푸시하지 않습니다.

터미널에서는 아래처럼 실행합니다.

```powershell
node scripts/publish.mjs
node scripts/publish.mjs --message "포트폴리오 사진과 설명 업데이트"
```

`--validate-only`는 생성·검증만 실행합니다. `--no-wait`는 커밋·push까지 진행하고 배포 상태 링크를 표시합니다. 기본 실행은 Pages 배포와 실제 사이트 확인까지 기다립니다. 배포 확인에는 최대 15분, 실제 사이트 버전 확인에는 추가로 최대 3분을 기다리며, 시간이 초과하면 완료된 업로드와 미확인 배포 상태를 구분해 안내합니다.

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
- 프로젝트 정보 양식 읽기: `scripts/information.mjs`
- 로컬 포트폴리오 변경 감지: `scripts/watch-portfolio.mjs`
- GitHub Pages 배포 패키징: `scripts/package-pages.mjs`
- 생성·검증·GitHub 업로드·Pages 배포 확인: `scripts/publish.mjs` / `publish-portfolio.cmd`

HTML 파일을 직접 편집해 사용할 수 있습니다. 공통 템플릿에서 여러 페이지를 다시 생성하려면 Node.js로 아래 명령을 실행합니다. **재생성하면 HTML 파일의 직접 수정 내용이 덮어써집니다.**

```powershell
node scripts/build.mjs
```

로컬 자동 갱신 미리보기는 다음 명령으로 실행합니다. 시작 시 사이트를 생성하고 약 1초마다 사진 변경을 확인합니다. 표시되는 주소를 열고 종료할 때 Ctrl+C를 누릅니다. 기본 포트가 사용 중이면 다른 포트를 선택합니다. 이 서버는 현재 사이트의 공개 HTML과 정적 자산만 제공합니다.

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
