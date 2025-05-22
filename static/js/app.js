/**
 * 애플리케이션 초기화 모듈
 * 모든 모듈을 로드하고 애플리케이션을 초기화합니다.
 */

// 문서 로드 완료 시 실행
document.addEventListener("DOMContentLoaded", function () {
  try {
    console.log("경제용 뉴스레터 애플리케이션 초기화 중...");

    // 1면 언박싱 비디오 배너 설정
    setupVideoBanner();

    // 콘텐츠 관리자 초기화
    if (window.ContentManager) {
      window.ContentManager.init();
      console.log("콘텐츠 관리자 초기화 완료");
    } else {
      console.error("콘텐츠 관리자 모듈을 찾을 수 없습니다.");
    }

    // 챗봇 초기화
    if (window.Chatbot) {
      window.Chatbot.init();
      console.log("챗봇 초기화 완료");
    } else {
      console.error("챗봇 모듈을 찾을 수 없습니다.");
    }

    // 푸터 항목 클릭 이벤트 설정
    setupFooterEvents();

    // 전역 검색 창 동작 설정
    setupGlobalSearchEvents();

    console.log("경제용 뉴스레터 애플리케이션 초기화 완료");
  } catch (error) {
    console.error("애플리케이션 초기화 중 오류 발생:", error);
  }
});

/**
 * 푸터 항목 클릭 이벤트 설정
 */
function setupFooterEvents() {
  const footerItems = document.querySelectorAll(".footer-list-item");

  footerItems.forEach((item) => {
    item.addEventListener("click", () => {
      // 제목 추출
      const title = item.querySelector("h3").textContent;

      // 챗봇 탭 활성화
      document.getElementById("tab-chatbot").click();

      // 제목 기반으로 쿼리 생성
      const query = title.replace(/[📈🏦📊]/g, "").trim();

      // 챗봇에 질문 전송
      const chatInput = document.getElementById("chat-input");
      chatInput.value = query;

      // 챗봇 메시지 전송 트리거
      window.Chatbot.sendMessage();
    });
  });
}

/**
 * 전역 검색 이벤트 설정
 */
function setupGlobalSearchEvents() {
  const globalSearch = document.getElementById("global-search");

  // 포커스 시 스타일 변경
  globalSearch.addEventListener("focus", () => {
    globalSearch.classList.add("ring-2", "ring-orange-500");
  });

  globalSearch.addEventListener("blur", () => {
    globalSearch.classList.remove("ring-2", "ring-orange-500");
  });

  // 모바일 디바이스 검출
  const isMobile = window.innerWidth < 768;

  // 모바일인 경우 검색창 크기 조정
  if (isMobile) {
    globalSearch.setAttribute("placeholder", "검색...");
  }

  // 화면 크기 변경 시 대응
  window.addEventListener("resize", () => {
    const isMobileNow = window.innerWidth < 768;
    if (isMobileNow) {
      globalSearch.setAttribute("placeholder", "검색...");
    } else {
      globalSearch.setAttribute("placeholder", "경제 용어 또는 콘텐츠 검색...");
    }
  });
}

/**
 * 1면 언박싱 비디오 배너 설정
 */
function setupVideoBanner() {
  const videoBanner = document.getElementById("video-banner");

  if (!videoBanner) return;

  videoBanner.addEventListener("click", handleUnboxingVideo);
}

async function handleUnboxingVideo() {
  console.log("서울경제 1면 언박싱 버튼 클릭됨");

  // 로딩 모달 생성
  createLoadingModal();

  try {
    const response = await fetch("/api/get-unboxing-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.url) {
      console.log("언박싱 비디오 URL:", data.url);
      // 새 창에서 열기
      window.open(data.url, "_blank");
    } else {
      alert("영상을 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("오류 발생:", error);
    alert("오류가 발생했습니다. 다시 시도해주세요.");
  } finally {
    // 로딩 모달 제거
    removeLoadingModal();
  }
}

function createLoadingModal() {
  // 기존 모달이 있다면 제거
  removeLoadingModal();

  // 모달 컨테이너 생성
  const modalContainer = document.createElement("div");
  modalContainer.id = "loading-modal";
  modalContainer.className = "loading-modal";

  // 경제용 캐릭터 메시지들
  const messages = [
    "경제용이가 영상을 찾고 있어요! 🐳",
    "잠깐만 기다려주세요~ 곧 영상이 열려요! 🎬",
    "서울경제 1면의 비밀을 언박싱 중... 📦",
    "경제용이가 열심히 준비 중이에요! 💪",
    "곧 만나요! 조금만 기다려주세요~ ✨",
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  modalContainer.innerHTML = `
        <div class="loading-content">
            <img src="/static/경제용.png" alt="경제용" class="w-12 h-12 rounded-full animate-bounce">
            <div class="loading-message">${randomMessage}</div>
            <div class="loading-spinner"></div>
        </div>
    `;

  document.body.appendChild(modalContainer);
}

function removeLoadingModal() {
  const modal = document.getElementById("loading-modal");
  if (modal) {
    modal.remove();
  }
}
