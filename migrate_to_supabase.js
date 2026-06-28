const fs = require('fs');
const https = require('https');
const path = require('path');

// 명령어 인자 확인 (node migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_KEY>)
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("오류: Supabase URL과 Service Role Key가 필요합니다.");
    console.log("사용법: node migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_KEY>");
    process.exit(1);
}

const supabaseUrl = args[0].replace(/\/$/, ""); // 끝자리 슬래시 제거
const serviceRoleKey = args[1];
const csvPath = path.join(__dirname, 'lotto_history.csv');

if (!fs.existsSync(csvPath)) {
    console.error(`오류: CSV 파일을 찾을 수 없습니다. 경로: ${csvPath}`);
    process.exit(1);
}

console.log("CSV 데이터를 읽고 파싱하는 중...");
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== "");

// 헤더 분리
const headers = lines[0].replace(/^\ufeff/, "").split(',');
const dataLines = lines.slice(1);

const records = [];
for (const line of dataLines) {
    const cols = line.split(',');
    if (cols.length < 9) continue;

    // 테이블 스키마에 맞게 맵핑
    records.push({
        round: parseInt(cols[0]),
        draw_date: cols[1],
        num1: parseInt(cols[2]),
        num2: parseInt(cols[3]),
        num3: parseInt(cols[4]),
        num4: parseInt(cols[5]),
        num5: parseInt(cols[6]),
        num6: parseInt(cols[7]),
        bonus: parseInt(cols[8]),
        sales_amt: parseInt(cols[9]) || 0,
        prize_1st: parseInt(cols[10]) || 0,
        winners_1st: parseInt(cols[11]) || 0
    });
}

console.log(`파싱 완료: 총 ${records.length}개 회차 데이터를 Supabase로 전송합니다.`);

// bulk insert (100개씩 배치로 전송)
const BATCH_SIZE = 100;
let currentIndex = 0;

function sendNextBatch() {
    if (currentIndex >= records.length) {
        console.log("\n🎉 초기 데이터 마이그레이션이 완료되었습니다!");
        process.exit(0);
    }

    const batch = records.slice(currentIndex, currentIndex + BATCH_SIZE);
    const postData = JSON.stringify(batch);
    
    // Supabase REST API URL 파싱
    const urlObj = new URL(`${supabaseUrl}/rest/v1/lotto_history`);
    
    const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates', // 중복인 경우 덮어쓰기(Upsert)
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                currentIndex += batch.length;
                console.log(`전송 성공: ${currentIndex} / ${records.length} 완료...`);
                // 다음 배치 전송
                setTimeout(sendNextBatch, 200); // 디비 부하를 줄이기 위한 0.2초 딜레이
            } else {
                console.error(`에러 발생 (상태코드: ${res.statusCode}):`, body);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error("전송 에러:", e.message);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}

// 첫 번째 배치 전송 시작
sendNextBatch();
