# Telegram Bot 및 Cloudflare Worker 설정 가이드

이 문서는 이 저장소의 `telegram-bot/worker.js`를 Cloudflare Workers에 배포하고 Telegram 웹훅을 연결하는 방법을 설명합니다. 봇은 `/start`, `/gen` 명령을 처리하며, 별도의 GitHub Actions 워크플로우는 매주 추천 번호를 채팅으로 전송합니다.

> 토큰은 비밀번호와 같습니다. 소스 코드, `wrangler.toml`, 커밋, 이슈 또는 화면 캡처에 기록하지 마세요. 노출됐다면 BotFather에서 즉시 폐기하고 새 토큰을 발급해야 합니다.

## 1. 준비 사항

- Telegram 계정
- Cloudflare 계정
- Node.js 18 이상 및 npm
- 이 저장소를 로컬에 복제한 환경

## 2. Telegram Bot 생성 및 토큰 발급

1. Telegram에서 공식 계정인 `@BotFather`를 검색해 대화를 시작합니다.
2. `/newbot`을 입력합니다.
3. 표시 이름을 입력합니다. 예: `Lotto Smart Bot`
4. `bot`으로 끝나는 고유 사용자 이름을 입력합니다. 예: `my_lotto_smart_bot`
5. BotFather가 반환한 HTTP API 토큰을 안전한 비밀 저장소에 보관합니다.

필요하면 BotFather의 `/setcommands`에서 아래 명령 목록을 등록합니다.

```text
start - 봇 소개 및 사용법
gen - 스마트 로또 번호 생성 (기본 5세트, 최대 50세트)
```

토큰을 재발급하거나 폐기하려면 BotFather에서 `/mybots` → 대상 봇 → `API Token`을 선택합니다.

## 3. Cloudflare Worker 배포

프로젝트 루트에서 다음 명령을 실행합니다.

```bash
cd telegram-bot
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler deploy
```

`secret put` 명령이 입력을 요청하면 BotFather에서 발급받은 토큰을 붙여 넣습니다. 배포가 완료되면 다음과 같은 Worker URL이 표시됩니다.

```text
https://lotto-smart-bot.<계정-서브도메인>.workers.dev
```

브라우저에서 해당 URL을 열어 아래 응답이 나오면 Worker가 동작 중입니다.

```text
Lotto Smart Bot is running!
```

Cloudflare 대시보드에서 등록하려면 `Workers & Pages` → 해당 Worker → `Settings` → `Variables and Secrets`에서 `TELEGRAM_BOT_TOKEN`을 Secret으로 추가한 뒤 다시 배포합니다.

## 4. Telegram 웹훅 연결

다음 URL의 자리표시자를 실제 값으로 바꾸어 브라우저 또는 `curl`로 호출합니다.

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https%3A%2F%2Flotto-smart-bot.<계정-서브도메인>.workers.dev"
```

성공 시 `"ok":true`가 반환됩니다. 등록 상태는 다음 요청으로 확인합니다.

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

웹훅을 해제하려면 다음 요청을 사용합니다.

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```

> 명령 기록에 토큰이 남을 수 있습니다. 공용 PC에서는 실행하지 말고, 실행 후 셸 기록을 적절히 관리하세요.

## 5. 봇 동작 테스트

1. Telegram에서 생성한 봇을 검색합니다.
2. `Start`를 누르거나 `/start`를 입력합니다.
3. `/gen`을 입력해 기본 추천 번호 5세트가 반환되는지 확인합니다.
4. `/gen 10`을 입력해 10세트가 반환되는지 확인합니다. 개수는 1~50 사이의 정수만 허용됩니다.
5. 응답이 없으면 아래 진단 명령으로 실시간 Worker 로그를 확인합니다.

```bash
cd telegram-bot
npx wrangler tail
```

## 6. 매주 자동 발송용 GitHub Actions 설정

`.github/workflows/send_weekly_telegram.yml`은 매주 금요일 12:00(KST)에 `send_lotto_telegram.js`를 실행합니다. 다음 GitHub Actions Secrets가 필요합니다.

| Secret 이름 | 용도 |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather가 발급한 봇 토큰 |
| `TELEGRAM_CHAT_ID` | 메시지를 받을 개인 또는 그룹 채팅 ID |
| `SUPABASE_URL` | 프로젝트의 Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 측 Supabase Service Role Key |

채팅 ID 확인 방법:

1. 봇에게 개인 메시지를 보내거나 대상 그룹에 봇을 추가한 뒤 메시지를 보냅니다.
2. 웹훅이 설정돼 있다면 잠시 해제합니다. Telegram Bot API에서 웹훅과 `getUpdates`는 동시에 사용할 수 없습니다.
3. 다음 요청을 실행합니다.

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"
   ```

4. 응답의 `result[].message.chat.id` 값을 확인합니다. 그룹 채팅 ID는 보통 음수입니다.
5. Cloudflare 봇도 계속 사용할 경우 4절의 `setWebhook` 요청으로 웹훅을 다시 등록합니다.

GitHub 저장소에서 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`을 선택해 위 값을 각각 등록합니다. 등록 후 `Actions` → `Weekly Smart Number → Telegram` → `Run workflow`로 수동 테스트합니다.

## 7. 수정 후 재배포

`telegram-bot/worker.js`를 수정한 뒤 아래 명령으로 다시 배포합니다. Worker URL이 유지되면 웹훅을 다시 등록할 필요가 없습니다.

```bash
cd telegram-bot
npx wrangler deploy
```

## 문제 해결

- `401 Unauthorized`: 봇 토큰이 잘못됐거나 폐기된 상태입니다.
- `404 Not Found`: Worker URL 또는 웹훅 경로를 확인합니다.
- `/gen`에 응답 없음: `getWebhookInfo`의 `last_error_message`와 `wrangler tail` 로그를 확인합니다.
- 그룹에서 명령을 못 읽음: `/gen@봇사용자이름`을 사용하거나 BotFather의 `/setprivacy` 설정을 검토합니다.
- 자동 발송 실패: GitHub Actions 실행 로그와 네 가지 Repository Secret 이름을 확인합니다.
