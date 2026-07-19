// Capacitor 네이티브 환경 전용 UX 보정 스크립트
// 웹 브라우저에서는 Capacitor 전역이 없으므로 아무 동작도 하지 않는다.
(function () {
    const cap = window.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

    const app = cap.Plugins && cap.Plugins.App;
    if (!app) return;

    // 하드웨어/제스처 뒤로가기: 웹뷰 히스토리가 있으면 back,
    // 홈(index)처럼 히스토리가 없으면 종료 확인 후 앱 종료
    app.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else if (window.confirm('앱을 종료하시겠습니까?')) {
            app.exitApp();
        }
    });
})();
