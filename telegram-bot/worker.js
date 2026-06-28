/**
 * Cloudflare Worker - Lotto Smart Bot
 *
 * /gen [개수] → 스마트 번호 생성 (기본 5세트, 최대 50세트)
 * /start → 봇 소개 메시지
 *
 * 환경 변수 (Cloudflare Worker Secret):
 *   TELEGRAM_BOT_TOKEN
 */

// ── 상수 ──────────────────────────────────────────────────
const PRIMES = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43]);

const FILTERS = {
    sumMin: 100, sumMax: 180,
    acMin: 7,
    oddMin: 2, oddMax: 4,
    lowMin: 2, lowMax: 4,
    primeMin: 1, primeMax: 4,
    g1Min: 1, g2Min: 1, g3Min: 1,
};

const STATS_DECK_URL = 'https://zaruous.github.io/lotto-golden-ratio/LOTTO%20STATS%20DECK.html';

// ── 번호 색상 이모지 ──────────────────────────────────────
function getBallEmoji(n) {
    if (n <= 10) return '\u{1F7E1}'; // 노랑
    if (n <= 20) return '\u{1F535}'; // 파랑
    if (n <= 30) return '\u{1F534}'; // 빨강
    if (n <= 40) return '\u2B1B';    // 검정
    return '\u{1F7E2}';              // 초록
}

// ── 통계 계산 ──────────────────────────────────────────────
function calcStats(nums) {
    const sorted = [...nums].sort((a, b) => a - b);
    const sum    = sorted.reduce((s, n) => s + n, 0);
    const odd    = sorted.filter(n => n % 2 !== 0).length;
    const low    = sorted.filter(n => n <= 22).length;
    const prime  = sorted.filter(n => PRIMES.has(n)).length;
    const g1     = sorted.filter(n => n <= 15).length;
    const g2     = sorted.filter(n => n >= 16 && n <= 30).length;
    const g3     = sorted.filter(n => n >= 31).length;

    const diffs = new Set();
    for (let i = 0; i < sorted.length - 1; i++)
        for (let j = i + 1; j < sorted.length; j++)
            diffs.add(sorted[j] - sorted[i]);
    const ac = diffs.size - (sorted.length - 1);

    return { sum, ac, odd, even: 6 - odd, low, high: 6 - low, prime, g1, g2, g3, sorted };
}

// ── 필터 통과 여부 ─────────────────────────────────────────
function passesFilter(s) {
    const f = FILTERS;
    return (
        s.sum >= f.sumMin && s.sum <= f.sumMax &&
        s.ac  >= f.acMin &&
        s.odd >= f.oddMin && s.odd <= f.oddMax &&
        s.low >= f.lowMin && s.low <= f.lowMax &&
        s.prime >= f.primeMin && s.prime <= f.primeMax &&
        s.g1 >= f.g1Min && s.g2 >= f.g2Min && s.g3 >= f.g3Min
    );
}

// ── 스마트 번호 생성 (몬테카를로) ─────────────────────────
function generateSmartSets(count = 5, maxTries = count * 100000) {
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
        const stats = calcStats(arr.slice(39));
        if (!passesFilter(stats)) continue;

        const isDuplicate = results.some(prev => {
            const prevSet = new Set(prev.sorted);
            return stats.sorted.filter(n => prevSet.has(n)).length >= 3;
        });
        if (!isDuplicate) results.push(stats);
    }
    return results;
}

// ── 메시지 포맷 ────────────────────────────────────────────
function buildGenMessages(sets) {
    const now = new Date().toLocaleDateString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });

    const header = '\uD83C\uDFB0 *스마트 로또 번호 추천*\n' +
        `\uD83D\uDCC5 ${now} · 총 ${sets.length}세트\n` +
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n';
    const footer = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n' +
        '[\uD83D\uDCCA \uBD84\uC11D \uB300\uC2DC\uBCF4\uB4DC](https://zaruous.github.io/lotto-golden-ratio/)';
    const messages = [];
    let msg = header;

    sets.forEach((s, i) => {
        const balls = s.sorted.map(n => `${getBallEmoji(n)}*${n}*`).join(' ');
        const setUrl = `${STATS_DECK_URL}?numbers=${s.sorted.join(',')}`;
        const block = `\u2728 [*SET ${i + 1}*](${setUrl})\n${balls}\n` +
            `  \u2211 ${s.sum} | AC ${s.ac} | \uD648\uC9DD ${s.odd}:${s.even} | \uACE0\uC800 ${s.low}:${s.high}\n\n`;

        // Telegram sendMessage의 4,096자 제한보다 여유 있게 분할한다.
        if (msg.length + block.length + footer.length > 3900) {
            messages.push(msg.trimEnd());
            msg = `\uD83C\uDFB0 *스마트 로또 번호 추천 (계속)*\n\n${block}`;
        } else {
            msg += block;
        }
    });

    messages.push(msg + footer);
    return messages;
}

function parseGenCount(text) {
    const command = text.split(/\s+/)[0];
    if (!/^\/gen(?:@\w+)?$/i.test(command)) return null;

    const args = text.split(/\s+/).slice(1);
    if (args.length === 0) return 5;
    if (args.length !== 1 || !/^\d+$/.test(args[0])) return NaN;

    const count = Number(args[0]);
    return count >= 1 && count <= 50 ? count : NaN;
}

// ── Telegram 메시지 전송 ───────────────────────────────────
async function sendMessage(token, chatId, text) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        })
    });
}

// ── Cloudflare Worker 진입점 ───────────────────────────────
export default {
    async fetch(request, env) {
        // GET 요청은 헬스체크로 처리
        if (request.method !== 'POST') {
            return new Response('Lotto Smart Bot is running!', { status: 200 });
        }

        try {
            const body = await request.json();
            const message = body.message || body.channel_post;
            if (!message || !message.text) return new Response('OK', { status: 200 });

            const chatId  = message.chat.id;
            const text    = (message.text || '').trim();
            const token   = env.TELEGRAM_BOT_TOKEN;

            // /gen 10 또는 /gen@봇이름 10 형태 모두 처리
            const genCount = parseGenCount(text);
            if (genCount !== null) {
                if (Number.isNaN(genCount)) {
                    await sendMessage(token, chatId,
                        '\u26A0\uFE0F 사용법: */gen [개수]*\n개수는 1~50 사이의 정수입니다. 예: `/gen 10`'
                    );
                    return new Response('OK', { status: 200 });
                }

                await sendMessage(token, chatId, `\u23F3 *스마트 번호 ${genCount}세트 생성 중...*`);
                const sets = generateSmartSets(genCount);

                if (sets.length === 0) {
                    await sendMessage(token, chatId, '\u274C 번호 생성에 실패했습니다. 다시 시도해주세요.');
                } else {
                    for (const message of buildGenMessages(sets)) {
                        await sendMessage(token, chatId, message);
                    }
                }

            } else if (text.startsWith('/start')) {
                await sendMessage(token, chatId,
                    '\uD83C\uDFB0 *LOTTO STATS BOT*\n\n' +
                    '\uD83D\uDCA1 */gen [개수]* \u2014 \uC2A4\uB9C8\uD2B8 \uBC88\uD638 \uC0DD\uC131 (\uAE30\uBCF8 5, \uCD5C\uB300 50)\n' +
                    '\uD83D\uDCC5 \uB9E4\uC8FC \uAE08\uC694\uC77C \uB099 12\uC2DC \uC790\uB3D9 \uBC1C\uC1A1\n\n' +
                    '[\uD83D\uDCCA \uBD84\uC11D \uB300\uC2DC\uBCF4\uB4DC \uBCF4\uAE30](https://zaruous.github.io/lotto-golden-ratio/)'
                );
            }

        } catch (e) {
            console.error('Worker error:', e);
        }

        return new Response('OK', { status: 200 });
    }
};
