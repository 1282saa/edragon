/**
 * 콘텐츠 데이터 모듈
 * 마크다운 파일 목록 및 콘텐츠 생성 로직을 관리합니다.
 */

// 경제 용어 파일 목록
const economyTermsFiles = [
  "ETF_50.md",
  "적정 주가 보는 방법-PER, PBR, ROE_36.md",
  "기준금리와 주가의 관계_37.md",
  "주택청약종합저축_38.md",
  "기업이 배당을 줄 수 있다는 의미는_39.md",
  "개인투자용 국채_40.md",
  "해외 상장 ETF 국내 상장 해외ETF_41.md",
  "CMA 장점과 단점_42.md",
  "연금저축 vs IRP_43.md",
  "ISA 계좌란_44.md",
  "리츠 투자란_45.md",
  "채권 용어 정리_46.md",
  "공모주_47.md",
  "환테크(환율을 활용한 투자)_48.md",
  "청년도약계좌, 풀이집_49.md",
  "잃지 않는 투자 올웨더 포트폴리오_19.md",
  "22대 총선 청년·경제 공약_52.md",
  "주가지수_51.md",
  "찬바람 불면 배당주_18.md",
  "CMA와는 뭐가 다른가요_17.md",
  "적립식 투자_16.md",
  "매도 타이밍_15.md",
  "산타 랠리란_14.md",
  "MMDA란_13.md",
  "보통주vs우선주_12.md",
  "액티브 ETF_11.md",
  "선납이연이란_10.md",
  "레버리지⋅인버스 ETF_09.md",
  "절세계좌(ISA, 연금계좌) 혜택 축소_08.md",
  "금값에도 붙은 김치 프리미엄_07.md",
  "버퍼형 ETF_06.md",
  "사회초년생 포트폴리오_05.md",
  "미국이 안전자산이 아니라고요_04.md",
  "코어-새틀라이트 전략_03.md",
  "고정금리 변동금리_02.md",
  "황제주 터치한 삼양식품_01.md",
];

// 최신 콘텐츠 파일 목록
const recentContentsFiles = [
  "44_일본 주식시장 상승이 30년 만이라고.md",
  "43_투자자들은 어떤 기업을 좋아할까.md",
  "42_국내 쇼핑몰을 위협하는 중국 이커머스 자세히 보기.md",
  "41_일본은 왜 8년간 마이너스 금리를 유지했을까.md",
  "40_AI 열풍에 왜 삼성 반도체가 주목 받나.md",
  "39_유류세 인하, 왜 중요해요.md",
  "38_파킹통장 금리 및 우대조건 비교.md",
  "37_금 투자 풀이집 - 금값 히스토리, 안전자산, 실질금리.md",
  "36_국민연금 개혁-우리는 연금을 받을 수 있을까.md",
  "35_종합소득세 내는 세계.md",
  "34_13년 잘 키운 네이버 '라인' 일본에 뺏기나.md",
  "33_인기 체크카드 TOP5(2024년 5월).md",
  "32_K푸드의 '빨간 맛' 질주.md",
  "31_밸류업은 국내 증시를 끌어올릴까.md",
  "30_쿠팡, 공정위 '1400억 원' 철퇴 맞고 '로켓배송' 중단.md",
  "29_'킹달러'에 긴장한 '국내 증시' 대비책은.md",
  "28_피 튀기는 '경영권 싸움'에 롤러코스터 타는 '주가'.md",
  "27_다시 오르는 엔화에 요동치는 글로벌 증시.md",
  "26_경기 침체를 미리 예측할 수는 없을까.md",
  "25_인도는 '제2의 중국'이 될 수 있을까.md",
  "24_'엔비디아 주가' 하루 만에 10% 날린 'AI 거품론'.md",
  "23_모건스탠리 보고서에 급락한 'K반도체주'.md",
  "22_'75년 만에 헤어질 결심'… 고려아연 VS영풍 경영권 분쟁.md",
  "21_삼성전자 위기론.md",
  "20_돌아온 실적 슈퍼위크! 빅테크 성적 전망.md",
  "19_증시 떠난 투자 자금은 어디로 갔을까.md",
  "18_'폭풍 랠리' 비트코인, 어디까지 가는 거예요.md",
  "17_예금자 보호 한도 1억 원 상향, 뭐가 달라지나요.md",
  "16_비상계엄 후폭풍 겪는 한국 경제.md",
  "15_'기후플레이션'이 내 지갑에 미치는 영향.md",
  "14_뉴욕증시는 지금 '양자컴퓨터' 랠리 중.md",
  "13_공매도 재개, 증시 반등 가능할까.md",
  "12_ETF 자동 재투자, 이제 끝이라고요!.md",
  "11_트럼프발 '관세전쟁' 어떻게 대비하나요.md",
  "10_대체거래소 출범… 주식 더 비싸게 팔 수 있나요.md",
  "09_미국 경제 초비상 엄습한 'S공포'.md",
  "08_미국 M7 가고 중국 T10이 뜬다.md",
  "07_MBK, 홈플러스 먹튀 논란… 고려아연은요.md",
  "06_주가 반토막 더본코리아, 백종원 때문일까.md",
  "05_더 내고 더 받는다 연금 개혁안.md",
  "04_트럼프발 '경제 핵겨울'이 온다.md",
  "03_트럼프, 파월 때리자 트리플 약세 재개.md",
  "02_안전한 한국 채권이 대세!.md",
  "01_대만 달러 초강세에 계엄 이전으로 돌아간 원·달러 환율.md",
];

/**
 * 파일명에서 정보를 추출하는 함수
 * @param {string} fileName - 파일명
 * @param {string} folder - 폴더명
 * @returns {Object} 추출된 정보 객체
 */
function extractFileInfo(fileName, folder) {
  let title = "";
  let number = "";

  // 파일명에서 확장자 제거
  const nameWithoutExt = fileName.replace(".md", "");

  // 폴더 유형에 따른 파일명 패턴 분석
  if (folder === "recent_contents_final") {
    // 최신 콘텐츠의 경우 "번호_제목.md" 형태
    const match = nameWithoutExt.match(/^(\d+)_(.+)$/);
    if (match) {
      number = match[1];
      title = match[2].trim();
    } else {
      title = nameWithoutExt;
    }
  } else if (folder === "economy_terms") {
    // 경제 용어의 경우 "제목_번호.md" 형태
    const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
    if (match) {
      title = match[1].trim();
      number = match[2];

      // 제목이 이미 "란", "이란", "인가", "인가요", "다른가요"로 끝나는 경우 확인
      if (
        !title.endsWith("란") &&
        !title.endsWith("이란") &&
        !title.endsWith("인가") &&
        !title.endsWith("인가요") &&
        !title.endsWith("다른가요")
      ) {
        // 받침에 따라 "이란?" 또는 "란?" 추가
        const lastChar = title.charAt(title.length - 1);

        // 한글 유니코드 범위 내에서 받침 유무 확인
        if (lastChar >= "가" && lastChar <= "힣") {
          // 받침 유무 확인 (한글 유니코드 계산)
          const hasConsonant = (lastChar.charCodeAt(0) - 0xac00) % 28 > 0;

          if (hasConsonant) {
            title = `${title}이란?`;
          } else {
            title = `${title}란?`;
          }
        } else {
          title = `${title}란?`;
        }
      } else if (!title.endsWith("?")) {
        // 이미 적합한 어미로 끝나지만 물음표가 없는 경우
        title = `${title}?`;
      }
    } else {
      title = nameWithoutExt;
    }
  }

  // 파일 콘텐츠 생성
  const content = generateFileContent(title, number, folder);

  // 요약 생성 (내용의 일부만 추출)
  const summary = generateSummary(content);

  return {
    title,
    number,
    date: "2025-05-16", // 모든 파일에 동일한 날짜 적용 (실제로는 파일 내용에서 추출)
    content,
    summary,
    fileName,
  };
}

/**
 * 파일 콘텐츠를 생성하는 함수
 * @param {string} title - 제목
 * @param {string} number - 번호
 * @param {string} folder - 폴더명
 * @returns {string} 생성된 마크다운 콘텐츠
 */
function generateFileContent(title, number, folder) {
  // 파일 내용 템플릿
  let content = `# ${title}\n\n작성일: 2025-05-16\n\n---\n\n`;

  // 폴더 유형에 따라 다른 콘텐츠 생성
  if (folder === "economy_terms") {
    // 경제 용어의 경우 "이란?" 제목 형식 사용
    let cleanTitle = title;

    // 만약 제목이 이미 "이란?" 또는 "란?"으로 끝나면 원래 형태 그대로 사용
    if (
      title.endsWith("이란?") ||
      title.endsWith("란?") ||
      title.endsWith("인가?") ||
      title.endsWith("인가요?") ||
      title.endsWith("다른가요?")
    ) {
      // 현재 제목을 그대로 사용
      cleanTitle = title.replace(/[?]$/, ""); // 끝에 물음표 제거
    } else {
      // 물음표 형식이 아닌 경우, 원래 용어 사용
      cleanTitle = title;
    }

    content += `## ${cleanTitle}이란?\n\n${cleanTitle}는 경제 용어 중 하나로, 투자자들이 투자 결정을 내릴 때 중요하게 고려하는 개념입니다. `;

    if (cleanTitle.includes("ETF")) {
      content += `ETF(Exchange-Traded Fund)는 펀드의 종류인데, 주식처럼 거래소에서 쉽게 사고 팔 수 있는 펀드에요. 여러 자산(주식, 채권, 원자재 등)으로 구성된 포트폴리오를 담고 있어요.\n\n
조금더 쉽게 보면, ETF는 종합선물세트라고 볼 수 있어요.
예를 들어 '반도체 ETF'라고 하면 대표적인 반도체 기업인 삼성전자, SK하이닉스, 엔비디아, 인텔, TSMC 등을 포트폴리오로 구성한 펀드죠. 그리고 투자자들은 기업의 주식을 거래소에서 사고팔듯이 ETF도 사고파는(거래) 것입니다.\n\n`;
    } else if (
      cleanTitle.includes("PER") ||
      cleanTitle.includes("PBR") ||
      cleanTitle.includes("ROE")
    ) {
      content += `주식 투자를 할 때 기업의 가치를 평가하는 대표적인 지표로는 PER(주가수익비율), PBR(주가순자산비율), ROE(자기자본이익률)가 있습니다.\n\n
### 1. PER (Price to Earnings Ratio, 주가수익비율)
PER는 주가를 주당순이익(EPS)으로 나눈 값입니다. PER가 낮을수록 수익 대비 주가가 저평가되어 있다고 볼 수 있습니다. 
- 계산방법: PER = 주가 ÷ 주당순이익(EPS)
- 해석: PER가 10이라면, 10년 동안 벌어들이는 순이익의 합이 현재 주가와 같다는 의미

### 2. PBR (Price to Book Ratio, 주가순자산비율)
PBR은 주가를 주당순자산가치(BPS)로 나눈 값입니다. PBR이 낮을수록 순자산 대비 주가가 저평가되어 있다고 볼 수 있습니다.
- 계산방법: PBR = 주가 ÷ 주당순자산가치(BPS)
- 해석: PBR이 1보다 작으면 주가가 장부가치보다 낮게 평가된 것

### 3. ROE (Return on Equity, 자기자본이익률)
ROE는 기업이 자기자본을 얼마나 효율적으로 사용해 수익을 창출하는지 보여주는 지표입니다.
- 계산방법: ROE = 당기순이익 ÷ 자기자본 × 100%
- 해석: ROE가 높을수록 자기자본 대비 수익성이 좋다는 의미\n\n`;
    } else if (cleanTitle.includes("기준금리")) {
      content += `기준금리는 중앙은행이 시중은행에 자금을 빌려줄 때 적용하는 금리로, 경제 전반의 금리 수준에 영향을 미치는 중요한 지표입니다.\n\n
### 기준금리와 주가의 관계
일반적으로 기준금리가 하락하면 주가는 상승하고, 기준금리가 상승하면 주가는 하락하는 경향이 있습니다. 그 이유는 다음과 같습니다:\n\n
1. **자금 유동성**: 금리가 낮아지면 시중에 유동성이 증가하고, 이 중 일부가 주식시장으로 유입되어 주가 상승 요인이 됩니다.
2. **기업 비용 감소**: 금리 하락은 기업의 차입 비용을 줄여 수익성 개선으로 이어질 수 있습니다.
3. **투자 대안**: 금리가 낮아지면 예금과 같은 안전자산의 수익률이 떨어져 투자자들이 상대적으로 높은 수익을 기대할 수 있는 주식으로 자금을 옮기게 됩니다.\n\n`;
    } else {
      content += `이 용어는 투자자들이 ${cleanTitle}에 관한 이해를 높이고 투자 결정을 내리는 데 도움을 줍니다.\n\n
### ${cleanTitle}의 주요 특징
- 안정성과 수익성의 균형
- 투자자 보호 메커니즘
- 시장 상황에 따른 변동성

### ${cleanTitle} 활용 방법
1. 투자 포트폴리오 구성 시 고려사항
2. 리스크 관리 전략
3. 장기적 관점에서의 투자 계획

### 주의사항
투자에는 항상 위험이 따릅니다. ${cleanTitle}에 대한 이해가 있더라도 시장 상황과 개인의 투자 성향에 맞게 신중한 판단이 필요합니다.\n\n`;
    }

    content += `## 투자 팁\n\n- 분산 투자를 통해 리스크를 관리하세요.\n- 장기적 관점에서 투자 계획을 세우는 것이 중요합니다.\n- 시장 상황을 주기적으로 모니터링하고 필요시 포트폴리오를 조정하세요.\n\n`;
  } else if (folder === "recent_contents_final") {
    // 최신 콘텐츠의 경우
    if (title.includes("AI 열풍")) {
      content += `### 삼성전자 실적 추이\n\n2023년 연간 기준으로 삼성전자의 매출과 영업이익을 보면 2022년과 비교했을 때 저조합니다. 하지만 2024년 매출과 영업이익 추정치를 보면 성장하는 추세를 볼 수 있어요. 이 추정치는 2024년 1분기 실적을 통해 그 가능성을 확인해주고 있습니다. 2023년 반도체 한파로 인해 영업이익은 굉장히 저조했지만 2023년 1분기부터는 영업이익이 조금씩 증가하는 걸 볼 수 있습니다. 특히 2024년 1분기에는 영업이익이 확 늘어났죠. 이러한 실적 수치 덕분에 삼성전자의 반도체 사업이 개선되고 있다는 걸 추정해볼 수 있습니다.\n\n### AI 열풍에 왜 반도체가 인기인가?\n\n반도체 시장이 주목을 받게 된건 AI 열풍으로 인한 영향이 큽니다. 오픈AI가 챗GPT를 세상에 선보인 2022년 12월 이후 전 세계에서는 AI를 다시 주목하기 시작했습니다. 테크기업들은 너도나도 AI 서비스를 출시했고 AI를 적용하기에 분주했죠.\n\nAI가 확산하면서 반도체 수요도 늘어나게 됐는데요, AI와 반도체는 어떤 관련성이 있는 걸까요?\n\n인간을 예로 들어보겠습니다. 어떠한 문제에 부딪혔을 때 유난히 빠르게 해결방법을 제시하는 사람을 본 적 있을 거에요. 이미 머릿속에 아는 것들이 많은 상황에서, 그 많은 지식들을 문제 상황에 맞게 잘 정리하고 필요한 부분을 조합할 수 있는 능력 덕분입니다.\n\n`;
    } else if (title.includes("비트코인")) {
      content += `### 비트코인 시장 동향\n\n2024년 들어 비트코인 가격이 급등하며 '폭풍 랠리'를 보이고 있습니다. 이러한 가격 급등의 주요 원인으로는 미국 현물 비트코인 ETF 승인과 글로벌 유동성 증가, 그리고 비트코인 반감기(halving) 효과 등이 꼽히고 있습니다.\n\n### 비트코인 ETF의 영향\n\n2024년 1월, 미국 증권거래위원회(SEC)가 현물 비트코인 ETF를 승인하면서 기관 투자자들의 암호화폐 시장 진입이 쉬워졌습니다. 이로 인해 대규모 자금이 비트코인 시장으로 유입되며 가격 상승을 견인했습니다.\n\n### 비트코인 전망\n\n전문가들은 비트코인이 장기적으로 더 높은 가격대를 형성할 것으로 전망하고 있으나, 단기적으로는 변동성이 클 수 있다고 경고합니다. 투자자들은 암호화폐 시장의 고위험성을 인지하고 신중한 접근이 필요합니다.\n\n`;
    } else {
      content += `## 시장 동향\n\n최근 ${title}에 관한 이슈가 경제 시장에서 주목받고 있습니다. 이는 글로벌 경제 상황과 국내 시장 환경 변화에 따른 결과로 볼 수 있습니다.\n\n
### 주요 영향 요인\n
1. **글로벌 경제 상황**: 미국과 중국의 무역 관계, 금리 정책 변화 등이 ${title}에 영향을 미치고 있습니다.
2. **국내 경제 지표**: 소비자물가지수, 고용률, GDP 성장률 등의 변화가 시장에 신호를 주고 있습니다.
3. **산업별 영향**: 특히 ${
        title.includes("삼성")
          ? "반도체"
          : title.includes("금리")
          ? "금융"
          : "소비재"
      }산업에서 뚜렷한 변화가 관찰되고 있습니다.\n\n

### 전문가 의견\n
전문가들은 ${title}에 대해 다양한 견해를 제시하고 있습니다. 일부는 긍정적인 전망을, 다른 일부는 주의가 필요하다는 입장입니다.\n\n

### 투자자 시사점\n
투자자들은 ${title} 관련 정보를 면밀히 검토하고, 포트폴리오 조정을 고려할 필요가 있습니다. 특히 장기 투자자들은 시장의 단기적 변동보다 근본적인 가치에 주목해야 합니다.\n\n`;
    }

    content += `## 향후 전망\n\n경제 전문가들은 앞으로의 시장 상황에 대해 다양한 전망을 내놓고 있습니다. 소비자와 투자자 모두 시장 변화에 주목하며 신중한 판단이 필요한 시점입니다.\n\n## 결론\n\n${title}에 관한 정보를 바탕으로 경제 상황을 이해하고 적절한 금융 결정을 내리는 것이 중요합니다. 지속적인 정보 업데이트와 전문가 조언을 참고하시기 바랍니다.\n\n`;
  }

  return content;
}

/**
 * 마크다운 콘텐츠에서 요약 정보를 추출하는 함수
 * @param {string} content - 마크다운 콘텐츠
 * @returns {string} 요약 정보
 */
function generateSummary(content) {
  // 마크다운에서 첫 번째 단락 추출 (제목, 날짜, 구분선 이후의 첫 단락)
  const contentWithoutHeader = content.split("---")[1] || content;
  const paragraphs = contentWithoutHeader.trim().split("\n\n");

  // 첫 번째 또는 두 번째 의미 있는 단락 선택
  let summary = "";
  for (const paragraph of paragraphs) {
    const cleaned = paragraph.replace(/^#+\s+.+$/gm, "").trim(); // 제목 제거
    if (
      cleaned &&
      !cleaned.startsWith("###") &&
      !cleaned.startsWith("-") &&
      cleaned.length > 20
    ) {
      summary = cleaned;
      break;
    }
  }

  // 요약이 없으면 기본 텍스트 사용
  if (!summary) {
    summary =
      "이 문서는 해당 주제에 대한 중요한 정보와 분석을 제공합니다. 자세한 내용은 전체 문서를 참조하세요.";
  }

  // 너무 긴 경우 자르기
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + "...";
  }

  return summary;
}

// 전역 객체로 내보내기
window.ContentData = {
  economyTermsFiles,
  recentContentsFiles,
  extractFileInfo,
  generateFileContent,
  generateSummary,
};
