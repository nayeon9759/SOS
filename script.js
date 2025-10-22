document.addEventListener("DOMContentLoaded", () => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");

  let localSubmissions = [];
  const chartInstances = new Map();

  const keyMap = {
    hasPet: "반려동물 보유",
    region: "지역",
    regionOther: "직접 입력 지역",
    priorityCriteria: "병원 선택 기준",
    concernAndFeature: "불만/필요 기능",
    priority1: "1순위 정보",
    priority2: "2순위 정보",
    priceRange: "최대 지불 의향"
  };

  const fetchSubmissions = async () => {
    try {
      submissionsList.innerHTML = '<div class="placeholder">불러오는 중...</div>';
      const res = await fetch(`${API_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        localSubmissions = data;
        renderSubmissions();
        if (document.querySelector('.tab-btn[data-target="submissions"]').classList.contains('active')) {
          renderCharts();
        }
      }
    } catch {
      submissionsList.innerHTML = '<div class="placeholder">서버 응답 오류</div>';
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "✅ 제출 중...";
    const data = new FormData(form);
    const payload = {};
    for (const [k, v] of data.entries()) payload[k] = v;

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    msg.textContent = "💌 제출 완료! 그래프 갱신 중...";
    await fetchSubmissions();
    form.reset();
    regionOtherInput.style.display = "none";
    document.querySelector('.tab-btn[data-target="submissions"]').click();
  });

  const renderSubmissions = () => {
    submissionsList.innerHTML = "";
    if (localSubmissions.length === 0) {
      submissionsList.innerHTML = '<div class="placeholder">아직 제출된 기록이 없습니다.</div>';
      return;
    }

    localSubmissions.slice().reverse().forEach(sub => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        .filter(([k, v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        .map(([k, v]) => `<div><strong>${keyMap[k] || k}:</strong> ${v}</div>`)
        .join("");
      card.innerHTML = html;
      submissionsList.appendChild(card);
    });
  };

  const renderCharts = () => {
    const regionCount = {};
    const priceCount = {};
    localSubmissions.forEach(sub => {
      const reg = sub.region === "기타" ? sub.regionOther : sub.region;
      if (reg) regionCount[reg] = (regionCount[reg] || 0) + 1;
      if (sub.priceRange) priceCount[sub.priceRange] = (priceCount[sub.priceRange] || 0) + 1;
    });

    const renderBarChart = (id, labels, data, color) => {
      const ctx = document.getElementById(id)?.getContext("2d");
      if (!ctx) return;
      if (chartInstances.has(id)) chartInstances.get(id).destroy();

      const newChart = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "응답 수", data, backgroundColor: color }] },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
      chartInstances.set(id, newChart);
    };

    const priceLabels = ["50만원 미만", "50만원 ~ 100만원", "100만원 ~ 200만원", "200만원 이상"];
    const priceData = priceLabels.map(l => priceCount[l] || 0);

    renderBarChart("regionChart", Object.keys(regionCount), Object.values(regionCount), "rgba(255,77,79,0.7)");
    renderBarChart("priceChart", priceLabels, priceData, "rgba(255,159,67,0.7)");
  };

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
      if (btn.dataset.target === "submissions") fetchSubmissions();
    });
  });

  document.querySelectorAll('input[name="region"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "기타") {
        regionOtherInput.style.display = "block";
        regionOtherInput.required = true;
      } else {
        regionOtherInput.style.display = "none";
        regionOtherInput.required = false;
      }
    });
  });

  fetchSubmissions();
});
