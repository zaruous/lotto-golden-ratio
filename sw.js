// LOTTO GOLDEN RATIO Service Worker
// 전략:
//  - 앱 셸(HTML/JS/CSV/manifest/아이콘)은 설치 시 프리캐시 → 오프라인 진입 시 흰 화면 방지
//  - 페이지 이동(navigate)과 lotto_history.csv는 network-first: 항상 최신 회차를 우선하되 실패 시 캐시 폴백
//  - 그 외 정적 자산(폰트 포함)은 cache-first
//  - Supabase API 요청은 캐시하지 않음 (각 페이지에 CSV 폴백 로직이 이미 존재)
const CACHE_NAME = 'lgr-static-v2';

const APP_SHELL = [
    './',
    './index.html',
    './LOTTO STATS DECK.html',
    './역대통계분석.html',
    './회차별상세분석.html',
    './히트맵분석.html',
    './supabase_config.js',
    './native-app.js',
    './lotto_history.csv',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.hostname.endsWith('.supabase.co')) return;

    const isNavigation = request.mode === 'navigate';
    const isCsv = url.pathname.endsWith('.csv');

    if (isNavigation || isCsv) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() =>
                    // ?round=N 같은 쿼리가 붙은 내비게이션도 프리캐시된 원본 HTML로 폴백
                    caches.match(request, { ignoreSearch: isNavigation })
                        .then((cached) => cached || caches.match('./index.html'))
                )
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) =>
            cached || fetch(request).then((response) => {
                if (response.ok || response.type === 'opaque') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
        )
    );
});
