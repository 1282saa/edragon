/**
 * 콘텐츠 관리 모듈
 * 콘텐츠 표시, 필터링, 정렬, 모달 처리 등을 관리합니다.
 */

// 콘텐츠 관리자 객체
window.ContentManager = (function () {
  // 내부 변수
  let termsData = [];
  let contentsData = [];
  let activeTabId = "tab-chatbot";
  let currentFilter = "";

  /**
   * 초기화 함수
   */
  function init() {
    // 탭 클릭 이벤트 설정
    setupTabEvents();

    // 경제 용어 컨텐츠 불러오기
    loadTermsData();

    // 최신 콘텐츠 불러오기
    loadContentsData();

    // 검색 이벤트 설정
    setupSearchEvents();

    // 정렬 이벤트 설정
    setupSortEvents();

    // 모달 이벤트 설정
    setupModalEvents();

    // 전역 검색 설정
    setupGlobalSearch();
  }

  /**
   * 탭 클릭 이벤트 설정
   */
  function setupTabEvents() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const sections = document.querySelectorAll("main");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.id;

        // 활성화된 탭 변경
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // 활성화된 섹션 변경
        sections.forEach((section) => section.classList.add("hidden"));

        // 각 탭에 해당하는 섹션 표시
        if (tabId === "tab-chatbot") {
          document.getElementById("chatbot-section").classList.remove("hidden");
        } else if (tabId === "tab-terms") {
          document.getElementById("terms-section").classList.remove("hidden");
        } else if (tabId === "tab-contents") {
          document
            .getElementById("contents-section")
            .classList.remove("hidden");
        }

        activeTabId = tabId;
      });
    });
  }

  /**
   * 경제 용어 데이터 로드
   */
  async function loadTermsData() {
    try {
      // 서버에서 파일 목록 가져오기
      const response = await fetch("/api/economy_terms");
      const data = await response.json();
      const files = data.files;
      
      termsData = [];
      
      // 각 파일의 내용을 가져오기
      for (const file of files) {
        try {
          const contentResponse = await fetch(`/api/economy_terms/${file}`);
          const content = await contentResponse.text();
          
          // 파일 정보 추출
          const fileInfo = window.ContentData.extractFileInfo(file, "economy_terms");
          
          // 원본 내용으로 업데이트
          fileInfo.content = content;
          
          // 원본 내용에서 첫 번째 단락을 요약으로 사용
          const lines = content.split('\n');
          const summaryLines = [];
          let foundContent = false;
          
          for (const line of lines) {
            if (line.startsWith('---')) {
              foundContent = true;
              continue;
            }
            if (foundContent && line.trim() && !line.startsWith('#')) {
              summaryLines.push(line);
              if (summaryLines.length >= 2) break;
            }
          }
          
          fileInfo.summary = summaryLines.join(' ').substring(0, 150) + '...';
          termsData.push(fileInfo);
        } catch (error) {
          console.error(`Failed to load ${file}:`, error);
        }
      }

      // 개수 표시 업데이트
      document.getElementById("terms-count").textContent = `(${termsData.length})`;

      // 데이터 표시
      displayTermsData(termsData);
    } catch (error) {
      console.error("Failed to load terms data:", error);
      // 폴백으로 기존 방식 사용
      const files = window.ContentData.economyTermsFiles;
      termsData = files.map((file) =>
        window.ContentData.extractFileInfo(file, "economy_terms")
      );
      document.getElementById("terms-count").textContent = `(${termsData.length})`;
      displayTermsData(termsData);
    }
  }

  /**
   * 최신 콘텐츠 데이터 로드
   */
  async function loadContentsData() {
    try {
      // 서버에서 파일 목록 가져오기
      const response = await fetch("/api/recent_contents");
      const data = await response.json();
      const files = data.files;
      
      contentsData = [];
      
      // 각 파일의 내용을 가져오기
      for (const file of files) {
        try {
          const contentResponse = await fetch(`/api/recent_contents/${file}`);
          const content = await contentResponse.text();
          
          // 파일 정보 추출
          const fileInfo = window.ContentData.extractFileInfo(file, "recent_contents_final");
          
          // 원본 내용으로 업데이트
          fileInfo.content = content;
          
          // 원본 내용에서 첫 번째 단락을 요약으로 사용
          const lines = content.split('\n');
          const summaryLines = [];
          let foundContent = false;
          
          for (const line of lines) {
            if (line.startsWith('---')) {
              foundContent = true;
              continue;
            }
            if (foundContent && line.trim() && !line.startsWith('#')) {
              summaryLines.push(line);
              if (summaryLines.length >= 2) break;
            }
          }
          
          fileInfo.summary = summaryLines.join(' ').substring(0, 150) + '...';
          contentsData.push(fileInfo);
        } catch (error) {
          console.error(`Failed to load ${file}:`, error);
        }
      }

      // 개수 표시 업데이트
      document.getElementById("contents-count").textContent = `(${contentsData.length})`;

      // 데이터 표시
      displayContentsData(contentsData);
    } catch (error) {
      console.error("Failed to load contents data:", error);
      // 폴백으로 기존 방식 사용
      const files = window.ContentData.recentContentsFiles;
      contentsData = files.map((file) =>
        window.ContentData.extractFileInfo(file, "recent_contents_final")
      );
      document.getElementById("contents-count").textContent = `(${contentsData.length})`;
      displayContentsData(contentsData);
    }
  }

  /**
   * 경제 용어 데이터 표시
   * @param {Array} data - 표시할 데이터 배열
   */
  function displayTermsData(data) {
    const termsGrid = document.getElementById("terms-grid");
    const noResults = document.getElementById("terms-no-results");

    // 그리드 초기화
    termsGrid.innerHTML = "";

    if (data.length === 0) {
      // 검색 결과가 없을 때 메시지 표시
      noResults.classList.remove("hidden");
      return;
    }

    // 검색 결과가 있으면 메시지 숨김
    noResults.classList.add("hidden");

    // 각 카드 생성
    data.forEach((item) => {
      const card = createCard(item, "terms");
      termsGrid.appendChild(card);
    });
  }

  /**
   * 최신 콘텐츠 데이터 표시
   * @param {Array} data - 표시할 데이터 배열
   */
  function displayContentsData(data) {
    const contentsGrid = document.getElementById("contents-grid");
    const noResults = document.getElementById("contents-no-results");

    // 그리드 초기화
    contentsGrid.innerHTML = "";

    if (data.length === 0) {
      // 검색 결과가 없을 때 메시지 표시
      noResults.classList.remove("hidden");
      return;
    }

    // 검색 결과가 있으면 메시지 숨김
    noResults.classList.add("hidden");

    // 각 카드 생성
    data.forEach((item) => {
      const card = createCard(item, "contents");
      contentsGrid.appendChild(card);
    });
  }

  /**
   * 카드 요소 생성
   * @param {Object} item - 카드 데이터
   * @param {string} type - 카드 유형 ('terms' 또는 'contents')
   * @returns {HTMLElement} 생성된 카드 요소
   */
  function createCard(item, type) {
    const card = document.createElement("div");
    card.className =
      "content-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200";

    let badgeColor = "";
    if (type === "terms") {
      badgeColor = "bg-blue-100 text-blue-800";
    } else {
      badgeColor = "bg-green-100 text-green-800";
    }

    card.innerHTML = `
      <div class="p-4">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs font-semibold uppercase ${badgeColor} px-2 py-1 rounded-full">No.${item.number}</div>
          <div class="text-xs text-gray-500">${item.date}</div>
        </div>
        <h3 class="font-bold text-lg text-gray-800 mb-2">${item.title}</h3>
        <p class="text-gray-600 text-sm line-clamp-3">${item.summary}</p>
      </div>
      <div class="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button class="text-orange-500 hover:text-orange-600 text-sm font-medium">자세히 보기 →</button>
      </div>
    `;

    // 카드 클릭 이벤트 추가
    card.addEventListener("click", () => {
      openModal(item);
    });

    return card;
  }

  /**
   * 검색 이벤트 설정
   */
  function setupSearchEvents() {
    // 경제 용어 검색 설정
    const termsSearch = document.getElementById("terms-search");
    termsSearch.addEventListener("input", () => {
      const searchValue = termsSearch.value.toLowerCase();
      const filteredData = termsData.filter(
        (item) =>
          item.title.toLowerCase().includes(searchValue) ||
          item.number.includes(searchValue)
      );
      displayTermsData(filteredData);
    });

    // 최신 콘텐츠 검색 설정
    const contentsSearch = document.getElementById("contents-search");
    contentsSearch.addEventListener("input", () => {
      const searchValue = contentsSearch.value.toLowerCase();
      const filteredData = contentsData.filter(
        (item) =>
          item.title.toLowerCase().includes(searchValue) ||
          item.number.includes(searchValue)
      );
      displayContentsData(filteredData);
    });

    // 검색 초기화 버튼 설정
    document
      .getElementById("terms-reset-search")
      .addEventListener("click", () => {
        document.getElementById("terms-search").value = "";
        displayTermsData(termsData);
      });

    document
      .getElementById("contents-reset-search")
      .addEventListener("click", () => {
        document.getElementById("contents-search").value = "";
        displayContentsData(contentsData);
      });
  }

  /**
   * 정렬 이벤트 설정
   */
  function setupSortEvents() {
    // 경제 용어 정렬 설정
    const termsSort = document.getElementById("terms-sort");
    termsSort.addEventListener("change", () => {
      const sortedData = sortData(termsData, termsSort.value);
      displayTermsData(sortedData);
    });

    // 최신 콘텐츠 정렬 설정
    const contentsSort = document.getElementById("contents-sort");
    contentsSort.addEventListener("change", () => {
      const sortedData = sortData(contentsData, contentsSort.value);
      displayContentsData(sortedData);
    });
  }

  /**
   * 데이터 정렬
   * @param {Array} data - 정렬할 데이터 배열
   * @param {string} sortType - 정렬 유형
   * @returns {Array} 정렬된 데이터 배열
   */
  function sortData(data, sortType) {
    const clonedData = [...data];

    switch (sortType) {
      case "number-asc":
        return clonedData.sort(
          (a, b) => parseInt(a.number) - parseInt(b.number)
        );
      case "number-desc":
        return clonedData.sort(
          (a, b) => parseInt(b.number) - parseInt(a.number)
        );
      case "title-asc":
        return clonedData.sort((a, b) => a.title.localeCompare(b.title));
      case "title-desc":
        return clonedData.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return clonedData;
    }
  }

  /**
   * 모달 이벤트 설정
   */
  function setupModalEvents() {
    const modal = document.getElementById("content-modal");
    const modalClose = document.getElementById("modal-close");
    const modalCloseBottom = document.getElementById("modal-close-bottom");

    // 모달 닫기 이벤트
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });

    modalCloseBottom.addEventListener("click", () => {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });

    // ESC 키 누르면 모달 닫기
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.style.display === "block") {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  }

  /**
   * 모달 열기
   * @param {Object} item - 표시할 항목 데이터
   * @param {string} quotedText - 하이라이트할 텍스트 (옵션)
   */
  function openModal(item, quotedText = null) {
    const modal = document.getElementById("content-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalDate = document.getElementById("modal-date");
    const modalContentBody = document.getElementById("modal-content-body");

    // 모달 내용 설정
    modalTitle.textContent = item.title;
    modalDate.textContent = `작성일: ${item.date} | No.${item.number}`;

    // 마크다운 변환 - 원본 내용을 그대로 변환
    let contentHtml = marked.parse(item.content);
    console.log('Original content length:', item.content.length);
    console.log('Converted HTML length:', contentHtml.length);
    
    // 인용된 텍스트 하이라이트
    if (quotedText && quotedText.length > 0) {
      console.log('Attempting to highlight text:', quotedText);
      console.log('Text length:', quotedText.length);
      
      // 더 유연한 텍스트 매칭 방법
      const searchText = quotedText.trim();
      console.log('Searching for text:', searchText);
      
      // 텍스트 전처리 - 마크다운 특수 문자 제거
      const cleanSearchText = searchText
        .replace(/^#+\s*/gm, '') // 헤딩 마크다운 제거
        .replace(/[*_~`]/g, '') // 강조 마크다운 제거
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // 링크 마크다운 제거
      
      console.log('Cleaned search text:', cleanSearchText);
      
      // 다양한 길이로 시도
      const searchLengths = [100, 50, 30, 20];
      let highlightApplied = false;
      
      for (const length of searchLengths) {
        if (highlightApplied) break;
        
        const currentSearchText = cleanSearchText.substring(0, Math.min(length, cleanSearchText.length));
        if (currentSearchText.length < 10) continue;
        
        console.log(`Trying with ${currentSearchText.length} characters:`, currentSearchText);
        
        // HTML 태그를 제거한 순수 텍스트에서 검색
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        // 검색 텍스트 위치 찾기
        const searchIndex = plainText.toLowerCase().indexOf(currentSearchText.toLowerCase());
        
        if (searchIndex !== -1) {
          console.log('Text found in plain text at index:', searchIndex);
          
          // HTML에서 해당 텍스트 찾아 하이라이트
          const escapedText = currentSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const htmlRegex = new RegExp(`([^>])(${escapedText})([^<])`, 'gi');
          
          contentHtml = contentHtml.replace(htmlRegex, '$1<span class="highlighted-citation">$2</span>$3');
          
          // 추가로 태그 내부에 있는 텍스트도 처리
          const flexibleRegex = new RegExp(`(${escapedText.replace(/\s+/g, '\\s*')})`, 'gi');
          contentHtml = contentHtml.replace(flexibleRegex, (match, p1) => {
            if (match.includes('highlighted-citation')) {
              return match; // 이미 하이라이트된 경우 건너뛰기
            }
            return `<span class="highlighted-citation">${p1}</span>`;
          });
          
          highlightApplied = true;
          console.log('Highlight applied successfully');
        }
      }
      
      if (!highlightApplied) {
        console.log('No match found with any search length');
        // 마지막 시도: 핵심 키워드로 검색
        const keywords = cleanSearchText.match(/\b\w{4,}\b/g) || [];
        if (keywords.length > 0) {
          const keyword = keywords[0];
          console.log('Trying with keyword:', keyword);
          const keywordRegex = new RegExp(`(${keyword})`, 'gi');
          if (contentHtml.match(keywordRegex)) {
            contentHtml = contentHtml.replace(keywordRegex, '<span class="highlighted-citation">$1</span>');
            console.log('Keyword-based match found and highlighted');
          }
        }
      }
    }

    // 최종 내용 설정 - 원본 내용을 그대로 표시
    modalContentBody.innerHTML = `
      <div class="markdown-content">
        ${contentHtml}
      </div>
    `;

    // 모달 표시
    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // 스크롤 방지
    
    // 하이라이트된 텍스트로 스크롤
    if (quotedText) {
      setTimeout(() => {
        const highlighted = document.querySelector('.highlighted-citation');
        if (highlighted) {
          highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  }

  /**
   * 전역 검색 설정
   */
  function setupGlobalSearch() {
    const globalSearch = document.getElementById("global-search");

    globalSearch.addEventListener("input", () => {
      const searchValue = globalSearch.value.toLowerCase();
      currentFilter = searchValue;

      // 현재 활성화된 탭에 따라 다른 검색 필드에도 값 적용
      if (activeTabId === "tab-terms") {
        document.getElementById("terms-search").value = searchValue;
        const filteredData = termsData.filter(
          (item) =>
            item.title.toLowerCase().includes(searchValue) ||
            item.number.includes(searchValue)
        );
        displayTermsData(filteredData);
      } else if (activeTabId === "tab-contents") {
        document.getElementById("contents-search").value = searchValue;
        const filteredData = contentsData.filter(
          (item) =>
            item.title.toLowerCase().includes(searchValue) ||
            item.number.includes(searchValue)
        );
        displayContentsData(filteredData);
      }
    });

    // 글로벌 검색 엔터 키 처리
    globalSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const searchValue = globalSearch.value.toLowerCase();

        // 검색어가 있으면 용어 탭으로 전환하고 검색 결과 표시
        if (searchValue) {
          // 용어 탭으로 전환
          document.getElementById("tab-terms").click();

          // 검색 필드에 값 설정
          document.getElementById("terms-search").value = searchValue;

          // 데이터 필터링 및 표시
          const filteredData = termsData.filter(
            (item) =>
              item.title.toLowerCase().includes(searchValue) ||
              item.number.includes(searchValue)
          );
          displayTermsData(filteredData);
        }
      }
    });
  }

  /**
   * 외부에서 호출하여 특정 콘텐츠 모달을 여는 함수
   * @param {string} fileName - 파일명
   * @param {string} sourceType - 소스 유형
   */
  function openContentModal(fileName, sourceType) {
    const dataArray = sourceType === "economy_terms" ? termsData : contentsData;
    const item = dataArray.find(d => d.fileName === fileName);
    
    if (item) {
      openModal(item);
    }
  }
  
  /**
   * 하이라이트와 함께 콘텐츠 모달을 여는 함수
   * @param {string} fileName - 파일명
   * @param {string} sourceType - 소스 유형
   * @param {string} quotedText - 인용된 텍스트
   */
  function openContentWithHighlight(fileName, sourceType, quotedText) {
    console.log('openContentWithHighlight called:', { fileName, sourceType, quotedText });
    const dataArray = sourceType === "economy_terms" ? termsData : contentsData;
    const item = dataArray.find(d => d.fileName === fileName);
    
    if (item) {
      console.log('Found item:', item.title);
      console.log('Item content length:', item.content ? item.content.length : 0);
      openModal(item, quotedText);
    } else {
      console.log('Item not found for fileName:', fileName);
      console.log('Available files:', dataArray.map(d => d.fileName));
    }
  }
  
  /**
   * 인용 상세 정보 표시 (새로운 모달 또는 탭 이동)
   * @param {string} fileName - 파일명
   * @param {string} sourceType - 소스 유형
   * @param {string} quotedText - 인용된 텍스트 (옵션)
   */
  function showCitationDetail(fileName, sourceType, quotedText = null) {
    console.log('showCitationDetail called:', { fileName, sourceType, quotedText });
    
    // 해당 탭으로 이동
    const tabId = sourceType === "economy_terms" ? "tab-terms" : "tab-contents";
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.click();
    }
    
    // 300ms 후에 모달 열기 (탭 전환 애니메이션 대기)
    setTimeout(() => {
      // quotedText가 있으면 디코딩
      let decodedText = null;
      if (quotedText && quotedText !== 'null' && quotedText !== 'undefined') {
        try {
          decodedText = decodeURIComponent(quotedText);
          console.log('Decoded quoted text:', decodedText);
        } catch (e) {
          console.error('Error decoding quoted text:', e);
          decodedText = quotedText;
        }
      }
      openContentWithHighlight(fileName, sourceType, decodedText);
    }, 300);
  }

  // 공개 API
  return {
    init,
    loadTermsData,
    loadContentsData,
    displayTermsData,
    displayContentsData,
    openContentModal,
    showCitationDetail,
  };
})();
