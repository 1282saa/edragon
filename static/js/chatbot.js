/**
 * 챗봇 모듈
 * RAG 기반 챗봇 기능을 구현합니다.
 */

// 챗봇 객체
window.Chatbot = (function () {
  // 내부 변수
  let isWaiting = false;
  let chatHistory = [];

  // 경제 용어 데이터 캐시
  let termsData = [];

  /**
   * 초기화 함수
   */
  function init() {
    // 초기 메시지를 채팅 기록에 추가
    chatHistory.push({
      role: "bot",
      content: '무엇이 궁금한가용? 예를 들어 "ETF가 뭐야?" 라고 물어보세용!',
    });

    // 이벤트 리스너 설정
    setupEventListeners();

    // 경제 용어 데이터 로드
    loadTermsData();

    // 추천 검색어 클릭 이벤트 설정
    setupSuggestedSearches();
  }

  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");

    // 전송 버튼 클릭 이벤트
    sendButton.addEventListener("click", () => {
      sendMessage();
    });

    // 엔터 키 이벤트
    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });

    // 입력 필드 포커스 이벤트
    chatInput.addEventListener("focus", () => {
      chatInput.classList.add("ring-2", "ring-orange-500");
    });

    chatInput.addEventListener("blur", () => {
      chatInput.classList.remove("ring-2", "ring-orange-500");
    });
  }

  /**
   * 경제 용어 데이터 로드
   */
  function loadTermsData() {
    if (window.ContentData) {
      const files = window.ContentData.economyTermsFiles;
      termsData = files.map((file) =>
        window.ContentData.extractFileInfo(file, "economy_terms")
      );
    }
  }

  /**
   * 메시지 전송
   */
  function sendMessage() {
    if (isWaiting) return;

    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();

    if (!message) return;

    // 사용자 메시지 추가
    addMessageToChat("user", message);

    // 입력 필드 초기화
    chatInput.value = "";

    // 응답 대기 상태로 변경
    isWaiting = true;

    // RAG 챗봇 응답 처리
    processRagChatbotResponse(message);
  }

  /**
   * RAG 챗봇 응답 처리 - 스트리밍 API 사용
   * @param {string} message - 사용자 메시지
   */
  function processRagChatbotResponse(message) {
    // EventSource를 사용한 스트리밍 처리
    const eventSource = new EventSource(
      `/api/chatbot/stream?query=${encodeURIComponent(message)}`
    );

    // 상태 메시지를 표시할 요소 생성
    const statusDiv = addStatusMessage("", "searching");
    let currentBotMessage = null;
    let accumulatedContent = "";

    eventSource.onmessage = function (event) {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "searching":
        case "processing":
        case "generating":
          // 상태 메시지 업데이트
          updateStatusMessage(statusDiv, data.message, data.type);
          break;

        case "content":
          // 첫 콘텐츠인 경우 상태 메시지 제거하고 봇 메시지 생성
          if (!currentBotMessage) {
            removeStatusMessage(statusDiv);
            currentBotMessage = addStreamingMessage("bot");
          }
          // 콘텐츠 누적 및 표시
          accumulatedContent += data.content;
          updateStreamingMessage(currentBotMessage, accumulatedContent);
          break;

        case "citations":
          // 인용 정보 저장 (나중에 사용)
          if (!currentBotMessage) {
            currentBotMessage = addStreamingMessage("bot");
          }
          // 최종 메시지를 인용과 함께 다시 렌더링
          finalizeStreamingMessage(
            currentBotMessage,
            accumulatedContent,
            data.citations
          );
          // 인용 정보 표시
          console.log("Received citations:", data.citations);
          addCitationsToChat(data.citations);
          break;

        case "sources":
          // 사용된 소스 정보 표시
          if (data.sources_used) {
            const sources = [];
            if (data.sources_used.internal) sources.push("내부 문서");
            if (data.sources_used.web) sources.push("실시간 웹 검색");
            if (sources.length > 0) {
              addSourcesIndicator(sources);
            }
          }
          break;

        case "done":
          // 완료 처리
          eventSource.close();
          isWaiting = false;
          break;

        case "error":
          // 오류 처리
          removeStatusMessage(statusDiv);
          addMessageToChat("bot", `오류가 발생했어용: ${data.message}`);
          eventSource.close();
          isWaiting = false;
          break;
      }
    };

    eventSource.onerror = function (error) {
      console.error("스트리밍 연결 오류:", error);
      removeStatusMessage(statusDiv);

      // fetch 폴백
      fetch("/api/chatbot/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: message }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            addMessageToChat("bot", `오류가 발생했어용: ${data.error}`);
          } else {
            addMessageToChat("bot", data.answer);
            if (data.citations && data.citations.length > 0) {
              addCitationsToChat(data.citations);
            }
          }
          isWaiting = false;
        })
        .catch((error) => {
          console.error("폴백 질의 오류:", error);
          addMessageToChat(
            "bot",
            "죄송해용, 답변을 생성하는 도중 오류가 발생했어용. 다시 시도해주세용."
          );
          isWaiting = false;
        });

      eventSource.close();
    };
  }

  /**
   * 통합 챗봇의 출처 정보 추가
   * @param {Array} citations - 출처 정보 배열
   */
  function addCitationsToChat(citations) {
    if (!citations || citations.length === 0) return;

    console.log("Adding citations to chat:", citations);

    const chatOutput = document.getElementById("chat-output");

    // 새 메시지 요소 생성
    const messageDiv = document.createElement("div");
    messageDiv.className =
      "chat-bubble bot-bubble citations-info bg-gray-50 border border-gray-200";

    // 로고 이미지 URL (Perplexity 로고 추가)
    const perplexityLogo =
      '<img src="https://www.perplexity.ai/favicon.ico" alt="Perplexity" class="w-4 h-4 inline-block mr-1">';

    // 출처 정보 HTML 생성
    let citationsHtml = '<div class="font-semibold mb-2">📚 출처 정보:</div>';

    // 출처 분류
    const internalCitations = citations.filter((c) => c.type === "internal");
    const webCitations = citations.filter((c) => c.type === "web");

    // 내부 문서 출처
    if (internalCitations.length > 0) {
      citationsHtml +=
        '<div class="mt-2 mb-1"><strong>내부 문서:</strong></div><ul class="space-y-1">';
      internalCitations.forEach((citation, index) => {
        const docType =
          citation.source_type === "economy_terms"
            ? "경제 용어"
            : "최신 콘텐츠";
        const cleanTitle = citation.title
          .replace(/_\d+/, "")
          .replace(/\.md$/, "");

        const quotedText = citation.quoted_text
          ? encodeURIComponent(citation.quoted_text)
          : "";
        console.log(`Citation ${index + 1} quoted text:`, citation.quoted_text);
        console.log(`Citation ${index + 1} encoded quoted text:`, quotedText);

        citationsHtml += `
          <li class="citation-item ml-3">
            <a href="#" class="text-blue-600 hover:underline flex items-center gap-1" 
               onclick="event.preventDefault(); console.log('Citation clicked', '${
                 citation.file_name
               }', '${
          citation.source_type
        }', '${quotedText}'); window.ContentManager.showCitationDetail('${
          citation.file_name
        }', '${citation.source_type}', '${quotedText}');">
              <span class="citation-number text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">${
                index + 1
              }</span>
              ${cleanTitle} (${docType})
            </a>
          </li>
        `;
      });
      citationsHtml += "</ul>";
    }

    // 웹 출처
    if (webCitations.length > 0) {
      citationsHtml += `<div class="mt-3 mb-1"><strong>웹 검색 결과 <span class="inline-flex items-center">${perplexityLogo}</span>:</strong></div><ul class="space-y-1">`;
      webCitations.forEach((citation, index) => {
        citationsHtml += `
          <li class="citation-item ml-3">
            <a href="${
              citation.url
            }" target="_blank" class="text-green-600 hover:underline flex items-center gap-1">
              <span class="citation-number text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">${
                internalCitations.length + index + 1
              }</span>
              ${citation.title}
              <span class="text-xs text-gray-500">(${citation.source})</span>
              <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
        `;
      });
      citationsHtml += "</ul>";
    }

    messageDiv.innerHTML = citationsHtml;

    // 채팅창에 추가
    chatOutput.appendChild(messageDiv);

    // 스크롤을 최신 메시지 위치로 이동
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  /**
   * 상태 메시지 추가
   * @param {string} message - 상태 메시지
   * @param {string} type - 메시지 타입
   * @returns {HTMLElement} 생성된 상태 메시지 요소
   */
  function addStatusMessage(message, type) {
    const chatOutput = document.getElementById("chat-output");
    const statusDiv = document.createElement("div");
    statusDiv.className =
      "chat-bubble bot-bubble status-message bg-orange-50 border-orange-200";
    statusDiv.id = `status-${Date.now()}`;

    let icon = "";
    let customMessage = "";

    switch (type) {
      case "searching":
        icon = "🔍";
        customMessage = "검색중이에용! 기다려주세용~";
        break;
      case "processing":
        icon = "📚";
        customMessage = "자료를 찾고 있어용! 조금만 기다려주세용~";
        break;
      case "generating":
        icon = "💭";
        customMessage = "답변을 준비하고 있어용! 거의 다 됐어용~";
        break;
      default:
        icon = "⏳";
        customMessage = message;
    }

    statusDiv.innerHTML = `
      <div class="flex items-center space-x-3">
        <img src="https://img2.stibee.com/d2fad6b1-3012-4b5c-943a-3ca4c6a1b546.png" 
             alt="경제용" class="w-12 h-12 rounded-full animate-bounce">
        <div class="flex-grow">
          <div class="font-semibold text-orange-700">경제용</div>
          <div class="text-orange-600">${customMessage}</div>
        </div>
        <span class="animate-pulse text-2xl">${icon}</span>
      </div>
    `;

    chatOutput.appendChild(statusDiv);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    return statusDiv;
  }

  /**
   * 상태 메시지 업데이트
   * @param {HTMLElement} element - 업데이트할 요소
   * @param {string} message - 새 메시지
   * @param {string} type - 메시지 타입
   */
  function updateStatusMessage(element, message, type) {
    if (!element) return;

    let icon = "";
    switch (type) {
      case "searching":
        icon = "🔍";
        break;
      case "processing":
        icon = "📚";
        break;
      case "generating":
        icon = "💭";
        break;
      default:
        icon = "⏳";
    }

    element.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="animate-pulse text-xl">${icon}</span>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * 상태 메시지 제거
   * @param {HTMLElement} element - 제거할 요소
   */
  function removeStatusMessage(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * 스트리밍 메시지 추가
   * @param {string} role - 메시지 발신자
   * @returns {HTMLElement} 생성된 메시지 요소
   */
  function addStreamingMessage(role) {
    const chatOutput = document.getElementById("chat-output");
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-bubble ${
      role === "user" ? "user-bubble ml-auto" : "bot-bubble"
    }`;
    messageDiv.id = `stream-${Date.now()}`;

    const sender = role === "user" ? "나" : "경제용";
    messageDiv.innerHTML = `
      <span class="font-semibold">${sender}:</span>
      <span class="message-content"></span>
      <span class="typing-cursor animate-pulse">▋</span>
    `;

    chatOutput.appendChild(messageDiv);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    return messageDiv;
  }

  /**
   * 스트리밍 메시지 업데이트
   * @param {HTMLElement} element - 업데이트할 요소
   * @param {string} content - 추가할 콘텐츠
   */
  function updateStreamingMessage(element, content) {
    if (!element) return;

    const contentSpan = element.querySelector(".message-content");
    if (contentSpan) {
      contentSpan.textContent = content;

      // 스크롤 위치 조정
      const chatOutput = document.getElementById("chat-output");
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }
  }

  /**
   * 사용된 소스 표시
   * @param {Array} sources - 사용된 소스 목록
   */
  function addSourcesIndicator(sources) {
    const chatOutput = document.getElementById("chat-output");
    const sourceDiv = document.createElement("div");
    sourceDiv.className = "chat-bubble bot-bubble sources-indicator";

    let sourceIcons = [];
    if (sources.includes("내부 문서")) sourceIcons.push("📚");
    if (sources.includes("실시간 웹 검색")) sourceIcons.push("🌐");

    sourceDiv.innerHTML = `
      <div class="flex items-center space-x-2 text-sm text-gray-600">
        <span class="font-semibold">사용된 소스:</span>
        <span>${sourceIcons.join(" ")} ${sources.join(", ")}</span>
      </div>
    `;

    chatOutput.appendChild(sourceDiv);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  /**
   * 스트리밍 메시지 최종화 (인용 번호 추가)
   * @param {HTMLElement} element - 메시지 요소
   * @param {string} content - 최종 콘텐츠
   * @param {Array} citations - 인용 정보
   */
  function finalizeStreamingMessage(element, content, citations) {
    if (!element || !citations) return;

    console.log("Finalizing streaming message with citations:", citations);

    // 타이핑 커서 제거
    const cursor = element.querySelector(".typing-cursor");
    if (cursor) {
      cursor.remove();
    }

    // 인용 번호를 클릭 가능한 링크로 변환
    let processedContent = content;
    if (citations.length > 0) {
      // 모든 인용에 대한 맵 생성
      const citationMap = {};
      citations.forEach((citation, index) => {
        citationMap[index + 1] = citation;
      });

      processedContent = content.replace(/\[(\d+)\]/g, (match, num) => {
        const citationNum = parseInt(num);
        const citation = citationMap[citationNum];

        if (citation) {
          console.log(`Processing citation [${num}]:`, citation);

          if (citation.type === "internal") {
            const quotedText = citation.quoted_text
              ? encodeURIComponent(citation.quoted_text)
              : "";
            console.log(`Encoded quoted text for [${num}]:`, quotedText);
            return `<a href="#" class="citation-link text-blue-600 hover:underline font-semibold" onclick="event.preventDefault(); console.log('Citation clicked', '${citation.file_name}', '${citation.source_type}', '${quotedText}'); window.ContentManager.showCitationDetail('${citation.file_name}', '${citation.source_type}', '${quotedText}');">[${num}]</a>`;
          } else if (citation.type === "web") {
            return `<a href="${citation.url}" target="_blank" class="citation-link text-green-600 hover:underline font-semibold">[${num}]</a>`;
          }
        }
        return match;
      });
    }

    // 메시지 내용 업데이트
    const contentSpan = element.querySelector(".message-content");
    if (contentSpan) {
      contentSpan.innerHTML = processedContent;
    }
  }

  /**
   * 메시지를 채팅창에 추가
   * @param {string} role - 메시지 발신자 역할 ('user' 또는 'bot')
   * @param {string} content - 메시지 내용
   * @param {Array} citations - 인용 정보 (옵션)
   */
  function addMessageToChat(role, content, citations = []) {
    const chatOutput = document.getElementById("chat-output");

    // 새 메시지 요소 생성
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-bubble ${
      role === "user" ? "user-bubble ml-auto" : "bot-bubble"
    }`;

    // 발신자 표시
    const sender = role === "user" ? "나" : "경제용";

    // 인용 번호 매칭 및 변환
    let processedContent = content;
    if (citations && citations.length > 0) {
      // [1], [2] 등의 패턴을 찾아서 클릭 가능한 링크로 변환
      processedContent = content.replace(/\[(\d+)\]/g, (match, num) => {
        const citationIndex = parseInt(num) - 1;
        if (citationIndex < citations.length) {
          const citation = citations[citationIndex];
          if (citation.type === "internal") {
            const quotedText = citation.quoted_text
              ? encodeURIComponent(citation.quoted_text)
              : "";
            return `<a href="#" class="citation-link text-blue-600 hover:underline" onclick="event.preventDefault(); window.ContentManager.showCitationDetail('${citation.file_name}', '${citation.source_type}', decodeURIComponent('${quotedText}'));">[${num}]</a>`;
          } else if (citation.type === "web") {
            return `<a href="${citation.url}" target="_blank" class="citation-link text-green-600 hover:underline">[${num}]</a>`;
          }
        }
        return match;
      });
    }

    messageDiv.innerHTML = `<span class="font-semibold">${sender}:</span> ${processedContent}`;

    // 채팅창에 추가
    chatOutput.appendChild(messageDiv);

    // 스크롤을 최신 메시지 위치로 이동
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // 채팅 기록에 메시지 추가
    chatHistory.push({ role, content });
  }

  /**
   * 추천 검색어 클릭 이벤트 설정
   */
  function setupSuggestedSearches() {
    const searchSuggestions = document.querySelectorAll(".search-suggestion");

    searchSuggestions.forEach((suggestion) => {
      suggestion.addEventListener("click", () => {
        const searchText = suggestion.querySelector("p").textContent;

        // 입력 필드에 텍스트 설정
        const chatInput = document.getElementById("chat-input");
        chatInput.value = searchText;

        // 메시지 전송
        sendMessage();
      });
    });
  }

  // 공개 API
  return {
    init,
    sendMessage,
    addMessageToChat,
  };
})();
