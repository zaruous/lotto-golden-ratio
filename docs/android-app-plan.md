# 🤖 안드로이드 앱 전환 계획 (LOTTO GOLDEN RATIO)

본 문서는 현재 GitHub Pages 기반 정적 웹 플랫폼(LOTTO GOLDEN RATIO)을 안드로이드 앱으로 배포하기 위한 실행 계획입니다.

> **진행 현황 (2026-07-19)**: A안(Capacitor 하이브리드) 확정. Phase 0(PWA화) 및 Phase 1(Capacitor 스캐폴딩) 완료 — `manifest.json`/`sw.js`/앱 아이콘 추가, `android/` 네이티브 프로젝트 생성, 런처 아이콘·스플래시 74종 생성 완료. 다음 단계는 Phase 2(모바일 UX 보정)이며, 빌드 검증에는 Android Studio(SDK) 설치가 필요합니다.

## 1. 현재 상태 진단

| 항목 | 현황 | 앱 전환 시 의미 |
| :--- | :--- | :--- |
| 프론트엔드 | Vanilla HTML/CSS/JS, 프레임워크·빌드툴 없음 (`package.json` 부재) | 별도 트랜스파일 없이 그대로 패키징 가능 |
| 데이터 소스 | Supabase(PostgreSQL) REST, 실패 시 로컬 `lotto_history.csv` 폴백 | 오프라인 폴백이 이미 설계되어 있어 앱 오프라인 대응이 쉬움 |
| 반응형 여부 | `index.html` 등 다수 파일에 `min-width: 768px/1200px` 기반 모바일 퍼스트 미디어쿼리 존재 | 모바일 레이아웃 재작업 부담이 적음 |
| 페이지 구조 | 5개 독립 HTML(`index`, `LOTTO STATS DECK`, `역대통계분석`, `회차별상세분석`, `히트맵분석`) + 상단 탭 내비게이션 | SPA가 아니라 페이지 이동(anchor) 구조 → 하드웨어 뒤로가기 버튼 처리가 별도 필요 |
| 자동화 | GitHub Actions(주 3회 크론) + Cloudflare Worker 텔레그램 봇 | 서버 인프라는 그대로 유지, 앱은 클라이언트일 뿐 |
| 자산 | 파일명에 한글/공백 포함(`LOTTO STATS DECK.html`, `회차별상세분석.html`) | 네이티브 프로젝트에 복사 시 URL 인코딩/파일명 정리 필요 |

## 2. 아키텍처 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
| :--- | :--- | :--- | :--- |
| **A. Capacitor 하이브리드 (추천)** | 기존 HTML/CSS/JS를 `www/` 자산으로 그대로 담고, Capacitor로 안드로이드 네이티브 셸(WebView + 브릿지)을 씌움 | 기존 코드 100% 재사용, 푸시 알림·스플래시·상태바·딥링크 등 네이티브 API 접근 가능, Play 스토어 정식 배포 가능 | 초기 프로젝트 세팅(Node/Gradle) 필요, 하드웨어 뒤로가기·네비게이션 커스텀 필요 |
| **B. TWA (Trusted Web Activity)** | Bubblewrap으로 현재 배포된 `https://zaruous.github.io/lotto-golden-ratio/`를 그대로 감싸는 초경량 래퍼 | 세팅 가장 빠름(반나절), 웹사이트 업데이트가 앱에 즉시 반영 | 도메인 소유 검증(`https://zaruous.github.io/.well-known/assetlinks.json`)이 `lotto-golden-ratio` 저장소가 아닌 **`zaruous.github.io` 루트 저장소**에 있어야 하므로 별도 권한 필요, 딥 네이티브 기능(FCM 등) 확장이 제한적 |
| **C. 완전 네이티브 재작성(Kotlin/Compose)** | UI·로직을 Kotlin으로 새로 작성, Supabase Kotlin SDK 연동 | 최고의 성능/UX, 위젯·워치 확장 등 자유도 최대 | 기존 5개 화면 전체 재작업 필요 → 공수 가장 큼, 디자인 가이드(글래스모피즘 등) 재구현 필요 |

**권장안: A. Capacitor 하이브리드.** 기존 vanilla 스택을 그대로 살리면서 Play 스토어 배포와 푸시 알림 같은 네이티브 기능을 얻을 수 있어 투자 대비 효과가 가장 높습니다. TWA(B)는 도메인 루트 권한 확보가 가능하면 "빠른 프로토타입"으로 병행 검토할 수 있습니다.

## 3. 단계별 실행 계획 (Capacitor 기준)

### Phase 0 — PWA 기반 다지기 (선행 작업)
- `manifest.json` 추가(앱 이름, 아이콘, `theme_color: #0b0f19`, `display: standalone`)
- 최소 Service Worker 추가: `lotto_history.csv`와 정적 자산(HTML/CSS/JS)을 캐싱해 오프라인 진입 시 흰 화면 방지
- 5개 HTML 파일명 정리: 공백/한글 파일명은 유지하되(브랜드 URL 그대로 유지), 앱 내부 자산 경로는 영문 슬러그(`stats-deck.html`, `history-stats.html` 등)로 별도 매핑 고려

### Phase 1 — Capacitor 프로젝트 스캐폴딩
- `npm init`, `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` 설치
- `capacitor.config.json`에서 `webDir`을 기존 정적 파일 루트로 지정(`www/`로 심볼릭 복사 또는 빌드 스크립트로 동기화)
- `npx cap add android` → Android Studio 프로젝트 생성
- 앱 아이콘/스플래시는 `design_guide.md`의 `#0b0f19` ~ `#1e1b4b` 그라데이션 톤 유지

### Phase 2 — 모바일 UX 보정
- 하드웨어/제스처 뒤로가기 버튼: `@capacitor/app`의 `backButton` 이벤트로 "웹뷰 히스토리 back → 없으면 앱 종료 확인" 로직 구현 (현재 페이지 이동이 `<a href>` 기반이라 웹뷰 `history` 스택과 자연스럽게 연동됨)
- 상단 스트레치 탭 내비게이션은 유지하되, 모바일에서 상태바/노치 영역(`safe-area-inset`) 대응 padding 추가
- 스크롤/터치 제스처 충돌 점검(차트 라이브러리가 있다면 pinch-zoom 등)

### Phase 3 — 네이티브 기능 확장
- **푸시 알림**: 현재 텔레그램 봇으로 발송 중인 "당첨 결과/새 회차 발표" 알림을 FCM(`@capacitor/push-notifications`)으로 이중화 — Cloudflare Worker에서 텔레그램과 함께 FCM 토픽 발송 추가
- **딥링크**: `lottogoldenratio://detail/{회차}` 형태로 회차별 상세 분석 페이지 딥링크 지원
- **위젯(선택)**: "오늘의 추천 조합"을 홈 화면 위젯으로 노출하려면 별도 네이티브 Kotlin 위젯 모듈 필요(Capacitor 범위 밖, Phase 5 이후 검토)

### Phase 4 — 오프라인 및 성능
- Supabase 연동 실패 시 로컬 CSV 폴백은 이미 구현되어 있음 → 앱 최초 설치 시 `lotto_history.csv`를 자산에 번들링해 완전 오프라인 최초 실행 보장
- WebView 캐시 정책 점검(Supabase anon key가 클라이언트에 노출되는 구조는 웹과 동일하게 유지 — RLS 정책으로 읽기 전용 권한만 부여되어 있는지 재확인 권장)

### Phase 5 — 테스트
- Android Studio 에뮬레이터(다양한 해상도: 360dp~412dp 폭) + 실기기 테스트
- 필터 시뮬레이션(몬테카를로 생성기)처럼 연산량이 많은 페이지의 저사양 기기 성능 확인

### Phase 6 — 배포
- 릴리즈 키스토어 생성 및 안전 보관(분실 시 앱 업데이트 불가하므로 백업 필수)
- Google Play Console 등록: 개인정보처리방침 페이지 필요(Supabase 익명 조회만 하면 최소 고지로 충분) — `docs/`에 privacy policy 초안 추가 예정
- **정책 리스크 점검**: Google Play는 실제 베팅/구매가 가능한 도박 앱을 국가별로 강하게 제한합니다. 본 앱은 "번호 통계 분석/시뮬레이션 도구"로, 실제 구매·베팅 기능이 없음을 스토어 설명에 명확히 기재해야 심사 반려를 피할 수 있습니다.
- 내부 테스트 트랙 → 비공개 테스트 → 프로덕션 순차 배포

## 4. 예상 공수 (참고용)

| Phase | 예상 기간 |
| :--- | :--- |
| 0. PWA 기반 다지기 | 0.5일 |
| 1. Capacitor 스캐폴딩 | 0.5일 |
| 2. 모바일 UX 보정 | 1일 |
| 3. 네이티브 기능(푸시 등) | 1~2일 |
| 4. 오프라인/성능 | 0.5일 |
| 5. 테스트 | 1일 |
| 6. 배포 준비 및 심사 | 1일 + 심사 대기 |

## 5. 다음 액션

1. ~~Capacitor 방식(A) 확정 여부 확인~~ ✅ 확정 (2026-07-19)
2. ~~`manifest.json` + Service Worker 추가로 PWA화 (Phase 0)~~ ✅ 완료
3. ~~`npx cap init` 및 `android/` 프로젝트 생성 PR~~ ✅ 완료
4. Android Studio에서 `npm run cap:sync` 후 `android/` 열어 에뮬레이터 빌드 확인
5. Phase 2 착수: `@capacitor/app` 설치 후 하드웨어 뒤로가기 처리, `safe-area-inset` 대응

## 6. 개발 워크플로 (스캐폴딩 후)

| 명령 | 설명 |
| :--- | :--- |
| `npm run icons` | `icons/`(PWA용)와 `assets/`(@capacitor/assets 소스) 아이콘 재생성 |
| `npm run sync:www` | 웹 자산(HTML/JS/CSV/manifest/sw/icons)만 골라 `www/`로 복사 |
| `npm run cap:sync` | `sync:www` 후 `cap sync android` — 네이티브 프로젝트에 웹 자산 반영 |
| `npm run cap:open` | Android Studio로 `android/` 프로젝트 열기 |
| `npx @capacitor/assets generate --android` | `assets/` 소스로 런처 아이콘·스플래시 재생성 |

- 웹 자산(HTML 등)을 수정하면 `npm run cap:sync`만 다시 실행하면 됩니다.
- `www/`와 `node_modules/`는 빌드 산출물이므로 gitignore 처리되어 있습니다.
