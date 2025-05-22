const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Puppeteer 브라우저 인스턴스
let browser = null;

// 브라우저 초기화
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false, // GUI 모드로 실행 (디버깅용)
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

// 1면 언박싱 비디오 URL 가져오기
app.post('/api/get-unboxing-video', async (req, res) => {
    console.log('언박싱 비디오 요청 받음');
    
    try {
        const browser = await initBrowser();
        const page = await browser.newPage();
        
        // 플레이리스트 페이지로 직접 이동
        const playlistUrl = 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727';
        console.log(`직접 플레이리스트로 이동: ${playlistUrl}`);
        await page.goto(playlistUrl, { waitUntil: 'networkidle2' });
        
        // 페이지 로드 대기
        await page.waitForTimeout(3000);
        
        // xpath로 전체재생 버튼 찾기
        console.log('XPath로 전체재생 버튼 찾는 중...');
        const playAllButtonXpath = '/html/body/div[1]/div[3]/div[2]/div/div[3]/div/div/div/a';
        
        try {
            // xpath로 버튼 찾기
            await page.waitForXPath(playAllButtonXpath, { timeout: 5000 });
            const [playAllButton] = await page.$x(playAllButtonXpath);
            
            if (playAllButton) {
                console.log('XPath로 전체재생 버튼 찾음! 클릭 시도...');
                await playAllButton.click();
                console.log('전체재생 버튼 클릭 완료!');
                
                // 클릭 후 페이지 이동 대기
                await page.waitForTimeout(3000);
                
                // 현재 URL 반환
                const finalUrl = page.url();
                console.log(`최종 URL: ${finalUrl}`);
                
                res.json({
                    success: true,
                    url: finalUrl,
                    autoplay: true
                });
            } else {
                console.log('전체재생 버튼을 찾을 수 없음');
                res.json({
                    success: false,
                    error: '전체재생 버튼을 찾을 수 없습니다',
                    url: playlistUrl
                });
            }
        } catch (xpathError) {
            console.error('XPath 오류:', xpathError.message);
            res.json({
                success: false,
                error: xpathError.message,
                url: playlistUrl
            });
        }
        
    } catch (error) {
        console.error('오류 발생:', error);
        res.json({
            success: false,
            error: error.message,
            url: 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727'
        });
    }
});

// 브라우저 종료 엔드포인트
app.post('/api/close-browser', async (req, res) => {
    if (browser) {
        await browser.close();
        browser = null;
    }
    res.json({ success: true });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Puppeteer 서버가 포트 ${PORT}에서 실행 중입니다.`);
});