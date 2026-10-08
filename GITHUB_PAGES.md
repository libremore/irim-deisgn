# GitHub Pages 배포

대상 저장소: `libremore/irim-deisgn` (요청한 철자 그대로).

이 문서와 워크플로 파일이 있다는 것만으로 저장소가 생성되거나 사이트가 게시되는 것은 아닙니다. GitHub 인증, 저장소 생성, 파일 업로드 및 Pages 설정이 필요합니다.

## 처음 배포

1. GitHub에 로그인하고 `libremore` 계정 아래에 `irim-deisgn` 공개 저장소를 만듭니다. 처음 업로드할 때는 README, 라이선스, `.gitignore`를 자동 추가하지 않은 빈 저장소가 편리합니다.
2. 현재 폴더의 파일을 `main` 브랜치에 업로드합니다. `.github/workflows/pages.yml`, `scripts`, `assets`, `portfolio`, 루트 HTML과 `.nojekyll`을 포함해야 합니다.
3. 저장소의 **Settings > Pages > Build and deployment > Source**를 **GitHub Actions**로 선택합니다.
4. **Actions > Deploy GitHub Pages > Run workflow**에서 `main`을 선택해 실행합니다. 설정 후 `main`에 변경을 업로드해도 자동 실행됩니다.
5. 워크플로의 `deploy` 작업이 성공하면 GitHub가 표시한 배포 주소를 엽니다. 기본 주소 형태는 `https://libremore.github.io/irim-deisgn/`입니다.

GitHub Free에서는 공개 저장소로 Pages를 사용할 수 있습니다. 비공개 저장소의 Pages 지원은 플랜에 따라 달라집니다. 공개 저장소의 소스와 사진은 누구나 볼 수 있으므로 비밀번호, 토큰, 비공개 자료를 올리지 마세요. 원본 브랜드·사진·글꼴의 공개 사용 권한도 확인하세요.

[GitHub 공식 배포 설정 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 터미널에서 처음 업로드

빈 저장소를 생성한 뒤 현재 폴더의 PowerShell에서 실행합니다. GitHub 인증은 Git의 로그인 안내를 통해 진행하고, 비밀번호나 토큰을 코드·문서에 저장하지 마세요.

```powershell
git init -b main
git add .
git commit -m "Prepare static site and GitHub Pages deployment"
git remote add origin https://github.com/libremore/irim-deisgn.git
git push -u origin main
```

이미 Git 저장소나 기존 원격 저장소가 있다면 위 초기화 명령을 반복하지 마세요. 기존 저장소에 파일이나 커밋이 있다면 강제 푸시하지 말고 먼저 기존 작업과 병합해야 합니다.

## 이후 포트폴리오 업데이트

`portfolio/주거공간/프로젝트명/` 또는 `portfolio/상업공간/프로젝트명/` 아래에 사진을 추가하고 `main`에 커밋·업로드하면 됩니다. GitHub Actions가 목록과 상세 페이지를 자동 생성하므로 GitHub에서 사진만 업로드한 경우에도 반영됩니다.

로컬에서 미리 확인하려면 `update-portfolio.cmd`를 실행하세요. 워크플로는 `scripts/build.mjs`로 루트 HTML과 상세 HTML을 재생성하므로 디자인·문구 변경은 해당 생성 스크립트에서 수정합니다. 생성된 HTML만 직접 수정하면 다음 자동 배포에서 덮어써집니다.

## 배포 파일과 검사

워크플로는 테스트, 정적 HTML 생성, 링크·이미지 검사, `_site` 패키징을 수행한 뒤 배포합니다. 실패하면 새 버전은 배포되지 않습니다.

- 배포 포함: 루트 사이트 HTML, `assets`, 사진이 있는 포트폴리오의 상세 HTML·숫자 이미지, `.nojekyll`
- 배포 제외: 관리 문서, `scripts`, `.github`, 검사 결과, 프로젝트의 `project.json`, 사진이 없는 예시 폴더
- `_site`는 재실행 시 교체되는 생성 전용 폴더이며 Git에 올리지 않습니다. 원본 파일을 넣지 마세요.

배포 패키지를 로컬에서 검사할 수도 있습니다.

```powershell
node scripts/build.mjs
python scripts/verify.py
node scripts/package-pages.mjs
python scripts/verify.py _site
```

별도 서버, 패키지 설치, 배포용 비밀 토큰은 필요 없습니다. GitHub Actions의 저장소 토큰과 Pages 배포 권한을 사용합니다. 사이트와 소스는 상대 경로를 사용하므로 저장소명 하위 경로에서도 동작합니다.

## 배포가 실패할 때

- Pages 미설정 또는 사이트를 찾을 수 없음: Settings > Pages에서 Source를 GitHub Actions로 설정한 뒤 워크플로를 다시 실행합니다.
- 대표 사진 누락·중복 번호·파일 참조 오류: Actions의 실패한 단계에서 오류를 확인하고 해당 파일을 수정합니다.
- 저장소 정책에서 Actions 또는 Pages가 비활성화됨: 계정·조직 관리자에게 허용 여부를 확인합니다.
- 기본 브랜치가 `main`이 아님: 기본 브랜치를 `main`으로 맞추거나 워크플로의 `branches`와 `build.if`를 실제 배포 브랜치에 맞게 수정합니다.

기존 `irimdesign.co.kr`의 DNS와 운영 사이트는 변경하지 않습니다. 사용자 지정 도메인은 기본 Pages 주소의 배포가 정상 동작한 뒤 별도로 연결하세요.
