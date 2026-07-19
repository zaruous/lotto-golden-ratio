// Capacitor webDir(www/) 동기화 스크립트
// 저장소 루트가 곧 GitHub Pages 웹 루트이므로, 앱에 필요한 자산만 www/로 복사한다.
// (스크린샷 PNG, 자동화 스크립트, telegram-bot 등은 APK 용량 절감을 위해 제외)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const ASSETS = [
    'index.html',
    'LOTTO STATS DECK.html',
    '역대통계분석.html',
    '회차별상세분석.html',
    '히트맵분석.html',
    'supabase_config.js',
    'native-app.js',
    'lotto_history.csv',
    'manifest.json',
    'sw.js',
    'icons'
];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

let missing = false;
for (const asset of ASSETS) {
    const src = path.join(ROOT, asset);
    if (!fs.existsSync(src)) {
        console.error('missing asset:', asset);
        missing = true;
        continue;
    }
    fs.cpSync(src, path.join(WWW, asset), { recursive: true });
    console.log('copied:', asset);
}

if (missing) {
    process.exit(1);
}
