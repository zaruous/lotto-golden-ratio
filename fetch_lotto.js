const fs = require('fs');
const https = require('https');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'lotto_history.csv');
const url = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all';

console.log("동행복권 API로부터 당첨 데이터를 가져옵니다...");

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.data || !json.data.list) {
                throw new Error("API 응답 포맷이 유효하지 않습니다.");
            }
            
            // 200회차 이상 필터링 후 오름차순 정렬
            const list = json.data.list
                .filter(item => item.ltEpsd >= 200)
                .sort((a, b) => a.ltEpsd - b.ltEpsd);
                
            console.log(`총 ${list.length}개 회차 데이터 추출 성공 (${list[0].ltEpsd}회 ~ ${list[list.length - 1].ltEpsd}회).`);
            
            // CSV 헤더 정의
            const headers = ['회차', '추첨일', '번호1', '번호2', '번호3', '번호4', '번호5', '번호6', '보너스', '총판매금액', '1등당첨금액', '1등당첨인원'];
            const csvRows = [headers.join(',')];
            
            for (const item of list) {
                // 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
                let dateStr = item.ltRflYmd;
                if (dateStr && dateStr.length === 8) {
                    dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
                }
                
                const row = [
                    item.ltEpsd,
                    dateStr,
                    item.tm1WnNo,
                    item.tm2WnNo,
                    item.tm3WnNo,
                    item.tm4WnNo,
                    item.tm5WnNo,
                    item.tm6WnNo,
                    item.bnsWnNo,
                    item.rlvtEpsdSumNtslAmt || 0,
                    item.rnk1WnAmt || 0,
                    item.rnk1WnNope || 0
                ];
                csvRows.push(row.join(','));
            }
            
            // MS Excel 인코딩(깨짐 방지)을 위해 UTF-8 BOM(\ufeff) 추가
            fs.writeFileSync(CSV_PATH, '\ufeff' + csvRows.join('\n'), 'utf8');
            console.log(`성공적으로 CSV 파일을 저장하였습니다: ${CSV_PATH}`);
        } catch (e) {
            console.error("데이터 처리 중 오류 발생:", e.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error("요청 오류:", err.message);
    process.exit(1);
});
