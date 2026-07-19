/**
 * send_lotto_result_telegram.js
 *
 * Supabase에서 최신 회차의 실제 당첨번호를 조회하여
 * Telegram Bot API로 발표 메시지를 전송합니다.
 *
 * 필요한 환경 변수 (GitHub Secrets):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - TELEGRAM_BOT_TOKEN
 *   - TELEGRAM_CHAT_ID
 */

'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID      = process.env.TELEGRAM_CHAT_ID;

// --- 유효성 검사 ---
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 없습니다.');
    process.exit(1);
}
if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 환경 변수가 없습니다.');
    process.exit(1);
}

function getBallEmoji(n) {
    if (n <= 10) return String.fromCodePoint(0x1F7E1); // 노랑
    if (n <= 20) return String.fromCodePoint(0x1F535); // 파랑
    if (n <= 30) return String.fromCodePoint(0x1F534); // 빨강
    if (n <= 40) return String.fromCodePoint(0x2B1B);  // 검정
    return String.fromCodePoint(0x1F7E2);              // 초록
}

function formatMoney(n) {
    return Number(n || 0).toLocaleString('ko-KR') + '원';
}

function buildMessage(row) {
    const statsDeckUrl = 'https://zaruous.github.io/lotto-golden-ratio/LOTTO%20STATS%20DECK.html';
    const nums = [row.num1, row.num2, row.num3, row.num4, row.num5, row.num6];
    const balls = nums.map(n => getBallEmoji(n) + '*' + n + '*').join(' ');
    const bonusBall = getBallEmoji(row.bonus) + '*' + row.bonus + '*';
    const setUrl = statsDeckUrl + '?numbers=' + nums.join(',');

    let msg = '🎉 *제' + row.round + '회 로또 당첨번호*\n';
    msg += '📅 추첨일: ' + row.draw_date + '\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += balls + '  ➕  ' + bonusBall + ' (보너스)\n\n';
    msg += '🏆 1등 당첨금: ' + formatMoney(row.prize_1st) + '\n';
    msg += '👥 1등 당첨인원: ' + (row.winners_1st || 0) + '명\n\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '[분석 대시보드에서 보기](' + setUrl + ')\n';
    msg += '_GitHub Actions 자동 발송_';

    return msg;
}

async function fetchLatestRow() {
    const url = SUPABASE_URL.replace(/\/$/, '') +
        '/rest/v1/lotto_history?select=round,draw_date,num1,num2,num3,num4,num5,num6,bonus,prize_1st,winners_1st&order=round.desc&limit=1';
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
        }
    });
    if (!res.ok) throw new Error('Supabase 조회 실패: ' + res.status);
    const data = await res.json();
    if (!data || data.length === 0) throw new Error('데이터가 없습니다.');
    return data[0];
}

async function sendTelegram(text) {
    const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        })
    });
    const json = await res.json();
    if (!json.ok) throw new Error('Telegram API 오류: ' + JSON.stringify(json));
    return json;
}

(async () => {
    try {
        console.log('Supabase에서 최신 당첨번호 조회 중...');
        const row = await fetchLatestRow();
        console.log('최신 회차: 제' + row.round + '회');

        const message = buildMessage(row);
        console.log('텔레그램 당첨번호 메시지 전송 중...');
        await sendTelegram(message);

        console.log('텔레그램 당첨번호 전송 완료!');
    } catch (err) {
        console.error('오류 발생:', err.message);
        process.exit(1);
    }
})();
