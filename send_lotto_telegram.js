/**
 * send_lotto_telegram.js
 *
 * Supabase에서 최근 로또 당첨 데이터를 조회하고,
 * 6가지 통계 필터를 모두 통과하는 스마트 번호 3세트를 생성하여
 * Telegram Bot API로 메시지를 전송합니다.
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

// --- 통계 필터 기준 ---
const FILTERS = {
    sumMin:    100,
    sumMax:    180,
    acMin:     7,
    oddMin:    2,
    oddMax:    4,
    lowMin:    2,
    lowMax:    4,
    primeMin:  1,
    primeMax:  4,
    g1Min:     1,
    g2Min:     1,
    g3Min:     1,
};

const PRIMES = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43]);

function getBallEmoji(n) {
    if (n <= 10) return String.fromCodePoint(0x1F7E1); // 노랑
    if (n <= 20) return String.fromCodePoint(0x1F535); // 파랑
    if (n <= 30) return String.fromCodePoint(0x1F534); // 빨강
    if (n <= 40) return String.fromCodePoint(0x2B1B);  // 검정
    return String.fromCodePoint(0x1F7E2);              // 초록
}

function calcStats(nums) {
    const sorted = [...nums].sort((a, b) => a - b);
    const sum   = sorted.reduce((s, n) => s + n, 0);
    const odd   = sorted.filter(n => n % 2 !== 0).length;
    const low   = sorted.filter(n => n <= 22).length;
    const prime = sorted.filter(n => PRIMES.has(n)).length;
    const g1    = sorted.filter(n => n <= 15).length;
    const g2    = sorted.filter(n => n >= 16 && n <= 30).length;
    const g3    = sorted.filter(n => n >= 31).length;

    const diffs = new Set();
    for (let i = 0; i < sorted.length - 1; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            diffs.add(sorted[j] - sorted[i]);
        }
    }
    const ac = diffs.size - (sorted.length - 1);

    return { sum, ac, odd, even: 6 - odd, low, high: 6 - low, prime, g1, g2, g3, sorted };
}

function passesFilter(stats) {
    const f = FILTERS;
    return (
        stats.sum   >= f.sumMin  && stats.sum   <= f.sumMax  &&
        stats.ac    >= f.acMin   &&
        stats.odd   >= f.oddMin  && stats.odd   <= f.oddMax  &&
        stats.low   >= f.lowMin  && stats.low   <= f.lowMax  &&
        stats.prime >= f.primeMin && stats.prime <= f.primeMax &&
        stats.g1    >= f.g1Min   &&
        stats.g2    >= f.g2Min   &&
        stats.g3    >= f.g3Min
    );
}

function generateSmartSets(count = 3, maxTries = 500000) {
    const results = [];
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    let tries = 0;

    while (results.length < count && tries < maxTries) {
        tries++;
        const arr = [...pool];
        for (let i = 44; i >= 39; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const nums = arr.slice(39);
        const stats = calcStats(nums);
        if (!passesFilter(stats)) continue;

        const isDuplicate = results.some(prev => {
            const prevSet = new Set(prev.sorted);
            return stats.sorted.filter(n => prevSet.has(n)).length >= 3;
        });
        if (!isDuplicate) results.push(stats);
    }

    console.log(tries.toLocaleString() + '번 시도 후 ' + results.length + '세트 생성 완료');
    return results;
}

function buildMessage(sets, latestRound) {
    const statsDeckUrl = 'https://zaruous.github.io/lotto-golden-ratio/LOTTO%20STATS%20DECK.html';
    const nextRound = latestRound + 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    let msg = '🎰 *스마트 로또 번호 추천*\n';
    msg += '📅 ' + dateStr + '\n';
    msg += '🎯 *다음 추첨: 제' + nextRound + '회*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n\n';

    sets.forEach((s, i) => {
        const balls = s.sorted.map(n => getBallEmoji(n) + '*' + n + '*').join(' ');
        const setUrl = statsDeckUrl + '?numbers=' + s.sorted.join(',');
        msg += '✨ [*SET ' + (i + 1) + '*](' + setUrl + ')\n';
        msg += balls + '\n';
        msg += '  합계: ' + s.sum + ' | AC: ' + s.ac + ' | 홀짝: ' + s.odd + ':' + s.even + ' | 고저: ' + s.low + ':' + s.high + '\n\n';
    });

    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '[분석 대시보드 보기](' + statsDeckUrl + ')\n';
    msg += '_GitHub Actions 자동 생성_';

    return msg;
}

async function fetchLatestRound() {
    const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/lotto_history?select=round&order=round.desc&limit=1';
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
        }
    });
    if (!res.ok) throw new Error('Supabase 조회 실패: ' + res.status);
    const data = await res.json();
    if (!data || data.length === 0) throw new Error('데이터가 없습니다.');
    return data[0].round;
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
        console.log('Supabase에서 최신 회차 조회 중...');
        const latestRound = await fetchLatestRound();
        console.log('최신 회차: 제' + latestRound + '회');

        console.log('스마트 번호 생성 중...');
        const sets = generateSmartSets(3);

        if (sets.length === 0) {
            throw new Error('조건을 만족하는 번호 세트를 생성하지 못했습니다.');
        }

        const message = buildMessage(sets, latestRound);
        console.log('텔레그램 메시지 전송 중...');
        await sendTelegram(message);

        console.log('텔레그램 메시지 전송 완료!');
    } catch (err) {
        console.error('오류 발생:', err.message);
        process.exit(1);
    }
})();
