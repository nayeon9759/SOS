document.addEventListener("DOMContentLoaded", () => {
  // Google Apps Script URL
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMiKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");

  let localSubmissions = [];

  // Key map
  const keyMap = {
    hasPet: "반려동물 보유",
    region: "지역",
    priorityCriteria: "병원 선택 기준",
    concernAndFeature: "불만/필요 기능",
    priority1: "1순위 정보",
    priority2: "2순위 정보",
    priceRange: "최대 지불 의향"
  };

  // 서버에서 최신 데이터 가져오기
  const fetchSubmissions = async () => {
    try {
      const uniqueApiUrl = `${API_URL}?t=${new Date().getTime()}`;
      submissionsList.innerHTML = '<div class="placeholder">제출된 기록을 불러오는 중입니다...</div>'; 

      const res = await fetch(uniqueApiUrl);
      const data = await res.json();

      if (Array.isArray(data)) {
        localSubmissions = data;
        renderSubmissions();
        renderSummaryCards(); // 요약 카드 갱신
      } else {
        submissionsList.innerHTML = '<div class="placeholder">데이터 로딩 실패</div>';
      }
    } catch (error) {
      console.error("서버 데이터 로딩 오류:", error);
      submissionsList.innerHTML = '<div class="placeholder">네트워크 오류</div>';
    }
  };

  // "기타" 입력 토글
  document.querySelectorAll('input[name="region"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === "기타") {
        regionOtherInput.style.display = "block";
        regionOtherInput.required = true;
      } else {
        regionOtherInput.style.display = "none";
        regionOtherInput.required = false;
        regionOtherInput.value = "";
      }
    });
  });

  // 폼 제출
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "✅ 제출 중...";

    const data = new FormData(form);
    const payload = {};
    for (const [k, v] of data.entries()) payload[k] = v;

    if (payload.region === "기타" && payload.regionOther) {
      payload.region = payload.regionOther;
    }
    delete payload.regionOther;

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      msg.textContent = "💌 제출이 완료되었습니다! 데이터 갱신 중...";
      form.reset();
      regionOtherInput.style.display = "none";

      await fetchSubmissions();

      // '다른 사람 의견 보기' 탭으로 이동
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.querySelector('.tab-btn[data-target="submissions"]').classList.add("active");
      document.getElementById("submissions").classList.add("active");

    } catch (error) {
      msg.textContent = "⚠️ 서버 오류 발생. 데이터를 불러옵니다.";
      await fetchSubmissions();
    }
  });

  // submissions 렌더링
  const renderSubmissions = () => {
    submissionsList.innerHTML = "";

    if (localSubmissions.length === 0) {
      submissionsList.innerHTML = '<div class="placeholder">제출된 기록이 없습니다.</div>';
      return;
    }

    localSubmissions.slice().reverse().forEach(sub => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        .filter(([k, v]) => v !== "" && k !== "Timestamp")
        .map(([k, v]) => `<div><strong>${keyMap[k] || k}:</strong> ${v}</div>`)
        .join("");
      if (!html) html = "<div>제출된 정보 없음</div>";
      card.innerHTML = html;
      submissionsList.appendChild(card);
    });
  };

  // 요약 카드 렌더링
  const renderSummaryCards = () => {
    const counts = { region: {}, priceRange: {} };
    localSubmissions.forEach(sub => {
      if (sub.region) counts.region[sub.region] = (counts.region[sub.region] || 0) + 1;
      if (sub.priceRange) counts.priceRange[sub.priceRange] = (counts.priceRange[sub.priceRange] || 0) + 1;
    });

    // 기존 요약 영역 초기화
    const summaryArea = document.querySelector('.summary-cards');
    if (summaryArea) summaryArea.remove();

    const container = document.createElement('div');
    container.className = 'summary-cards';

    // 지역별 카드
    const regionCard = document.createElement('div');
    regionCard.className = 'summary-card';
    regionCard.innerHTML = `<h4>지역 통계</h4>`;
    for (const key of ["서울", "경기도", "경상도", "기타"]) {
      const val = counts.region[key] || 0;
      const bar = `<div style="width:${val*20}px;background:var(--accent);margin:2px 0;padding:2px;border-radius:4px;">${key} (${val})</div>`;
      regionCard.innerHTML += bar;
    }
    container.appendChild(regionCard);

    // 최대 지불 의향 카드
    const priceCard = document.createElement('div');
    priceCard.className = 'summary-card';
    priceCard.innerHTML = `<h4>최대 지불 의향</h4>`;
    for (const key of ["50만원 미만","50만원 ~ 100만원","100만원 ~ 200만원","200만원 이상"]) {
      const val = counts.priceRange[key] || 0;
      const bar = `<div style="width:${val*20}px;background:var(--primary);margin:2px 0;padding:2px;border-radius:4px;">${key} (${val})</div>`;
      priceCard.innerHTML += bar;
    }
    container.appendChild(priceCard);

    document.getElementById("submissions").prepend(container);
  };

  // 탭 클릭
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");

      if (btn.dataset.target === "submissions") {
        fetchSubmissions();
      }
    });
  });

  // 초기 데이터 로드
  fetchSubmissions();
});
