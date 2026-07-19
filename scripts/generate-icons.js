// 앱 아이콘/스플래시 생성 스크립트
// design_guide.md의 다크 그라데이션(#1e1b4b → #0b0f19) 배경 위에
// 황금비(φ) 심볼을 도형(타원 + 수직선)으로 그려 폰트 의존성 없이 렌더링한다.
// 출력:
//  - icons/           : PWA manifest용 아이콘 (192 / 512 / maskable)
//  - assets/          : @capacitor/assets 소스 (icon-only, foreground, background, splash)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');

function phiGlyph(cx, cy, height) {
    const ry = height * 0.33;
    const rx = ry * 0.74;
    const strokeWidth = height * 0.085;
    return `
    <g stroke="url(#gold)" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none">
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
        <line x1="${cx}" y1="${cy - height / 2}" x2="${cx}" y2="${cy + height / 2}"/>
    </g>`;
}

function buildSvg({ size, withBackground, cornerRadius, glyphFraction }) {
    const defs = `
    <defs>
        <radialGradient id="bg" cx="0.8" cy="0.05" r="1.3">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="65%" stop-color="#0b0f19"/>
        </radialGradient>
        <!-- userSpaceOnUse: 폭이 0인 line 요소는 objectBoundingBox 그라데이션이 무효라 렌더링되지 않음 -->
        <linearGradient id="gold" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
    </defs>`;
    const background = withBackground
        ? `<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>`
        : '';
    const glyph = glyphFraction > 0 ? phiGlyph(size / 2, size / 2, size * glyphFraction) : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}${background}${glyph}</svg>`;
}

async function render(spec, outFile) {
    const outPath = path.join(ROOT, outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(Buffer.from(buildSvg(spec))).png().toFile(outPath);
    console.log('generated:', outFile);
}

// Play 스토어 그래픽 이미지(Feature Graphic, 1024x500)
function featureGraphicSvg() {
    const w = 1024;
    const h = 500;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
        <radialGradient id="bg" cx="0.85" cy="0" r="1.4">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="65%" stop-color="#0b0f19"/>
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="title" x1="0" y1="0" x2="${w}" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="35%" stop-color="#ffffff"/>
            <stop offset="90%" stop-color="#a5b4fc"/>
        </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${phiGlyph(190, 250, 300)}
    <text x="370" y="235" font-family="Segoe UI, Arial, sans-serif" font-size="56" font-weight="800" fill="url(#title)" letter-spacing="1">LOTTO GOLDEN RATIO</text>
    <text x="373" y="300" font-family="Malgun Gothic, Segoe UI, sans-serif" font-size="28" fill="#94a3b8">로또 6/45 통계 분석 · 시뮬레이션 플랫폼</text>
</svg>`;
}

async function renderFeatureGraphic() {
    const outPath = path.join(ROOT, 'assets/feature-graphic.png');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(Buffer.from(featureGraphicSvg())).png().toFile(outPath);
    console.log('generated: assets/feature-graphic.png');
}

(async () => {
    // PWA manifest용
    await render({ size: 192, withBackground: true, cornerRadius: 42, glyphFraction: 0.62 }, 'icons/icon-192.png');
    await render({ size: 512, withBackground: true, cornerRadius: 112, glyphFraction: 0.62 }, 'icons/icon-512.png');
    // maskable: OS가 외곽을 잘라내므로 풀블리드 배경 + 세이프존(중앙 45%) 안에 심볼 배치
    await render({ size: 512, withBackground: true, cornerRadius: 0, glyphFraction: 0.45 }, 'icons/icon-maskable-512.png');

    // @capacitor/assets 소스 (npx @capacitor/assets generate --android)
    await render({ size: 1024, withBackground: true, cornerRadius: 0, glyphFraction: 0.6 }, 'assets/icon-only.png');
    await render({ size: 1024, withBackground: false, cornerRadius: 0, glyphFraction: 0.5 }, 'assets/icon-foreground.png');
    await render({ size: 1024, withBackground: true, cornerRadius: 0, glyphFraction: 0 }, 'assets/icon-background.png');
    await render({ size: 2732, withBackground: true, cornerRadius: 0, glyphFraction: 0.18 }, 'assets/splash.png');
    await render({ size: 2732, withBackground: true, cornerRadius: 0, glyphFraction: 0.18 }, 'assets/splash-dark.png');

    // Play 스토어 등록용
    await renderFeatureGraphic();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
