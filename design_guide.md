# LOTTO STATS DECK 디자인 및 UX 표준 가이드라인

본 문서는 프로젝트의 통합된 브랜드 아이덴티티와 프리미엄 사용자 경험(UX)을 구축하기 위해 `index.html`을 기조로 정립된 UI/UX 표준 가이드라인입니다. 모든 분석 화면 및 기능 페이지는 본 규격을 100% 준수해야 합니다.

---

## 1. 디자인 시스템 토큰 (CSS Variables)

모든 페이지의 `:root`에는 아래 색상 명도와 테마 변수쌍이 정의되어 있어야 합니다.

```css
:root {
    --bg-primary: #0b0f19;
    --bg-secondary: #1e293b;
    --accent-primary: #6366f1;   /* Indigo */
    --accent-secondary: #a855f7; /* Purple */
    --accent-success: #10b981;   /* Emerald */
    --accent-warning: #f59e0b;   /* Amber */
    --accent-error: #ef4444;     /* Rose */
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --glass-bg: rgba(30, 41, 59, 0.45);
    --glass-border: rgba(255, 255, 255, 0.05);
}
```

---

## 2. 전역 배경 및 폰트 레이아웃

- **폰트 패밀리**: 애플 샌프란시스코 및 세고에 UI 등 시스템 산세리프 폰트를 결합하여 가독성을 높입니다.
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
- **전역 배경**: 단조로운 검정색이 아닌, 우측 상단에서 뻗어 나오는 은은한 우주 테마 심해 그래디언트를 적용합니다.
  ```css
  background: radial-gradient(circle at top right, #1e1b4b, var(--bg-primary) 60%);
  background-attachment: fixed;
  ```
- **바디 패딩 및 세로 정렬**: 화면 간 이동 시 타이틀 높이가 달라지지 않도록 `body`에 `display: flex` 같은 정렬 함수를 쓰지 않고 기본 블록 모드와 상단 패딩 `20px`를 통일해 타이틀의 시작 좌표를 화면 상단으로부터 정확히 $60\text{px}$($body\text{ 패딩 }20\text{px} + header\text{ 마진 }40\text{px}$) 지점으로 고정시킵니다.
  ```css
  body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: radial-gradient(circle at top right, #1e1b4b, var(--bg-primary) 60%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      padding: 20px;
      line-height: 1.6;
  }
  ```
- **전체 컨테이너**: 중심 콘텐츠 영역은 `max-width: 1200px` 레이아웃 전용 구조로 선언하며, 전체 화면을 잡아버리는 어두운 카드배경이나 외곽선은 부여하지 않습니다.
  ```css
  .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 50px;
  }
  ```
- **비출력용 최상단 SVG 처리 규칙**: 그라데이션 정의(`linearGradient`) 등 렌더링 영역이 없는 비출력용 `<svg>` 태그를 `<body>` 상단에 삽입하는 경우, 브라우저 인라인 정렬 여백에 의해 타이틀 높이가 밀리는 현상을 원천 방지하기 위해 반드시 절대 좌표 및 크기 제거 속성을 명시해야 합니다.
  ```html
  <svg width="0" height="0" style="position: absolute; width: 0; height: 0; overflow: hidden;">
  ```

---

## 3. 헤더 및 타이틀

- **헤더 여백**: 헤더에는 외곽선이나 불필요한 테두리를 두지 않고 여백을 균일화합니다.
  ```css
  header {
      text-align: center;
      margin: 40px 0 35px 0;
  }
  ```
- **타이틀(H1)**: 굵기 `800`의 대담한 타이틀에 은은한 그래디언트 클리핑을 가미합니다.
  ```css
  background: linear-gradient(135deg, #fff 40%, var(--accent-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  ```
- **서브타이틀**: 명도를 낮춘 옅은 블루-그레이 컬러(`var(--text-muted)`)를 통해 서열 구조를 명확히 만듭니다.

---

## 4. 통합 네비게이션 탭 메뉴 (Stretched Tab Menu)

가로 너비를 100% 채우고 일정한 균형을 맞추는 **풀-와이드 스트레치 메뉴** 구조를 준수합니다.

```css
.nav-bar {
    display: flex;
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 35px;
    gap: 4px;
}

.nav-link {
    flex: 1;
    text-align: center;
    padding: 12px 15px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 8px;
    transition: all 0.2s;
}

.nav-link:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
}

.nav-link.active {
    color: #fff;
    background: var(--accent-primary);
    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}
```

---

## 5. 글래스모피즘 카드 인터페이스 (Glassmorphism Cards)

콘텐츠를 담는 모든 패널/카드는 유리 질감의 글래스모피즘 설계를 반영합니다.

```css
.card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 28px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 카드 호버 마이크로 인터랙션 */
.card:hover {
    transform: translateY(-5px);
    border-color: rgba(99, 102, 241, 0.25);
    box-shadow: 0 15px 35px rgba(99, 102, 241, 0.12);
}
```

---

## 6. 버튼 및 상호작용 피드백 (Interactive Elements)

- **공통 포커스 링**: 인풋이나 셀렉트 포커스 시 `box-shadow: 0 0 8px rgba(99, 102, 241, 0.3)`를 통일하여 파란 글로우 피드백을 유지합니다.
- **액티브 상태 트랜지션**: 모든 모션에는 급격한 깜빡임이 없도록 `transition: all 0.2s` 또는 입체감 있는 베지어 함수(`cubic-bezier(0.16, 1, 0.3, 1)`)를 결합합니다.
