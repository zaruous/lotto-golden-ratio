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

            // Supabase 동기화 추가 (환경 변수가 설정되어 있을 경우에만 실행)
            const supabaseUrl = process.env.SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && serviceRoleKey) {
                console.log("Supabase 데이터베이스 동기화를 진행합니다...");
                syncToSupabase(list, supabaseUrl, serviceRoleKey);
            } else {
                console.log("Supabase 환경 변수가 설정되지 않아 DB 동기화를 생략합니다.");
            }
        } catch (e) {
            console.error("데이터 처리 중 오류 발생:", e.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error("요청 오류:", err.message);
    process.exit(1);
});

// Supabase 동기화 함수
function syncToSupabase(list, supabaseUrl, serviceRoleKey) {
    const records = list.map(item => {
        let dateStr = item.ltRflYmd;
        if (dateStr && dateStr.length === 8) {
            dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }
        return {
            round: item.ltEpsd,
            draw_date: dateStr,
            num1: item.tm1WnNo,
            num2: item.tm2WnNo,
            num3: item.tm3WnNo,
            num4: item.tm4WnNo,
            num5: item.tm5WnNo,
            num6: item.tm6WnNo,
            bonus: item.bnsWnNo,
            sales_amt: item.rlvtEpsdSumNtslAmt || 0,
            prize_1st: item.rnk1WnAmt || 0,
            winners_1st: item.rnk1WnNope || 0
        };
    });

    const postData = JSON.stringify(records);
    const urlObj = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/lotto_history`);
    
    const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log("🎉 Supabase 데이터베이스 동기화가 성공적으로 완료되었습니다!");
            } else {
                console.error(`Supabase 동기화 에러 (상태코드: ${res.statusCode}):`, body);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error("Supabase 연결 에러:", e.message);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}
