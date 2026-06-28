# GitHub Pages 연동 및 배포 가이드

이 저장소는 빌드 과정이 없는 정적 사이트입니다. 저장소 루트의 `index.html`과 관련 자산을 GitHub Pages에서 직접 배포할 수 있습니다.

## 1. 저장소 준비

GitHub에 새 저장소를 만든 뒤 로컬 프로젝트를 연결합니다. 이미 `origin`이 설정된 경우에는 원격 추가 명령을 생략합니다.

```bash
git init
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

이 프로젝트의 현재 Pages 주소 형식은 다음과 같습니다.

```text
https://<OWNER>.github.io/<REPOSITORY>/
```

## 2. 인증 토큰 발급

GitHub 웹사이트에서 Pages를 배포하는 것 자체에는 Personal Access Token(PAT)이 필요하지 않습니다. 토큰은 비밀번호 인증을 대신해 HTTPS로 `git push`하거나 외부 배포 도구에서 GitHub API를 호출할 때 사용합니다. SSH 키 또는 GitHub CLI 로그인을 사용한다면 PAT를 만들지 않아도 됩니다.

Fine-grained PAT 발급 절차:

1. GitHub 우측 상단 프로필 → `Settings`로 이동합니다.
2. `Developer settings` → `Personal access tokens` → `Fine-grained tokens`를 선택합니다.
3. `Generate new token`을 선택합니다.
4. 토큰 이름과 짧은 만료 기간을 지정합니다.
5. `Repository access`에서 이 저장소만 선택합니다.
6. `Repository permissions`에서 `Contents`를 `Read and write`로 설정합니다.
7. 토큰을 생성하고 즉시 안전한 비밀 저장소에 보관합니다. 생성 후 전체 값은 다시 표시되지 않습니다.

HTTPS push에서 암호를 요구하면 사용자 이름에는 GitHub 사용자 이름, 암호에는 PAT를 입력합니다. 토큰을 원격 URL에 포함하거나 저장소 파일에 기록하지 마세요. 가능하면 OS 자격 증명 관리자 또는 GitHub CLI를 사용합니다.

```bash
gh auth login
```

토큰이 노출되면 `Settings` → `Developer settings` → `Personal access tokens`에서 즉시 폐기합니다.

## 3. GitHub Pages 활성화

1. GitHub 저장소 → `Settings` → `Pages`로 이동합니다.
2. `Build and deployment`의 `Source`를 `Deploy from a branch`로 선택합니다.
3. `Branch`에서 `main`과 `/(root)`를 선택합니다.
4. `Save`를 누릅니다.
5. `Actions` 탭에서 Pages 배포 작업이 완료될 때까지 기다립니다.

배포가 완료되면 다음 주소에서 사이트를 확인합니다.

```text
https://<OWNER>.github.io/<REPOSITORY>/
```

Pages가 비활성화돼 있거나 비공개 저장소를 사용할 경우 계정/조직 플랜 및 정책에 따라 사용 가능 여부가 달라질 수 있습니다.

## 4. 변경 사항 배포

정적 파일을 수정한 뒤 `main` 브랜치에 push하면 GitHub Pages가 자동으로 다시 배포됩니다.

```bash
git add .
git commit -m "Update site"
git push origin main
```

배포 상태는 저장소의 `Actions` 탭 또는 `Settings` → `Pages`에서 확인합니다. 캐시 때문에 이전 화면이 보이면 배포 완료 후 강력 새로고침을 실행합니다.

## 5. GitHub Actions로 배포하는 선택 사항

빌드 단계가 추가되거나 배포 파일만 별도로 제어해야 할 때는 `Settings` → `Pages`에서 Source를 `GitHub Actions`로 변경합니다. 저장소에 `.github/workflows/pages.yml`을 만들고 다음 예시를 사용합니다.

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

이 워크플로우는 GitHub가 자동 제공하는 `GITHUB_TOKEN`과 OIDC 권한을 사용하므로 별도 PAT를 Repository Secret에 저장할 필요가 없습니다. 현재처럼 단순 정적 사이트라면 3절의 브랜치 배포가 더 간단합니다.

## 6. 사용자 지정 도메인 연결(선택 사항)

1. `Settings` → `Pages` → `Custom domain`에 도메인을 입력합니다.
2. DNS 제공자에서 GitHub가 안내하는 레코드를 설정합니다.
3. DNS 검증이 완료되면 `Enforce HTTPS`를 활성화합니다.
4. 설정 과정에서 생성되는 `CNAME` 파일을 삭제하지 않습니다.

## 문제 해결

- `404`: `main` 브랜치 루트에 `index.html`이 있는지, Pages의 브랜치/폴더 선택이 맞는지 확인합니다.
- CSS·이미지 누락: `/asset.png` 같은 도메인 루트 경로 대신 `./asset.png` 또는 저장소 하위 경로를 사용합니다.
- push 인증 실패: PAT의 만료 여부, 저장소 선택 및 `Contents: Read and write` 권한을 확인합니다.
- Actions 배포 권한 오류: 워크플로우의 `pages: write`, `id-token: write`와 저장소 Pages Source 설정을 확인합니다.
- 변경 미반영: Actions 배포 완료 여부를 확인하고 브라우저 캐시를 새로고침합니다.

