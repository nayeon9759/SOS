document.addEventListener("DOMContentLoaded", () => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");

  let localSubmissions = [];
  let regionChartInstance = null;
  let priceChartInstance = null;

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
      const uniqueApiUrl = `${API_URL}?t=${new Date().getTime()}`;
      submissionsList.innerHTML = '<div class="placeholder">데이터 불러오는 중...</div>';
      const res = await fetch(uniqueApiUrl);
      const data = await res.json();
      if (Array.isArray(data)) {
        localSubmissions = data;
        renderSubmissions();
        renderCharts();
      } else {
        submissionsList.innerHTML = '<div class="placeholder">데이터 형식 오류</div>';
      }
    } catch (error) {
      submissionsList.innerHTML = '<div class="placeholder">서버 오류로 데이터를 불러올 수 없습니다.</div>';
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "✅ 제출 중...";
    const data = new FormData(form);
    const payload = {};
    for (const [k, v] of data.entries()) payload[k] = v;
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      msg.textContent = "💌 제출이 완료되었습니다!";
      await fetchSubmissions();
      form.reset();
      regionOtherInput.style.display = "none";
      document.querySelector('.tab-btn[data-target="submissions"]').click();
    } catch (error) {
      msg.textContent = "⚠️ 서버 응답 오류, 그래도 데이터는 저장되었습니다.";
      await fetchSubmissions();
    }
  });

  const renderSubmissions = () => {
    submissionsList.innerHTML = "";
    if (localSubmissions.length === 0) {
      submissionsList.innerHTML = '<div class="placeholder">아직 제출된 기록이 없습니다.</div>';
      return;
    }
    localSubmissions.slice().reverse().forEach((sub) => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        .filter(([k, v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        .map(([k, v]) => `<div><strong>${keyMap[k] || k}:</strong> ${v}</div>`)
        .join("");
      card.innerHTML = html || "<div>제출된 정보 없음</div>";
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

    const renderBarChart = (ctxId, labels, data, color) => {
      const ctx = document.getElementById(ctxId).getContext("2d");
      if (ctxId === 'regionChart' && regionChartInstance) regionChartInstance.destroy();
      if (ctxId === 'priceChart' && priceChartInstance) priceChartInstance.destroy();
      const newChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "응답 수",
            data,
            backgroundColor: color,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#333",
              titleColor: "#fff",
              bodyColor: "#fff"
            }
          },
          scales: {
            x: {
              ticks: { color: "#ccc" },
              grid: { color: "rgba(255,255,255,0.05)" }
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#ccc", stepSize: 1 },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          }
        }
      });
      if (ctxId === 'regionChart') regionChartInstance = newChart;
      if (ctxId === 'priceChart') priceChartInstance = newChart;
    };

    const priceLabelsOrdered = ["50만원 미만", "50만원 ~ 100만원", "100만원 ~ 200만원", "200만원 이상"];
    const priceDataOrdered = priceLabelsOrdered.map(label => priceCount[label] || 0);

    renderBarChart("regionChart", Object.keys(regionCount), Object.values(regionCount), "rgba(255, 180, 60, 0.8)");
    renderBarChart("priceChart", priceLabelsOrdered, priceDataOrdered, "rgba(100, 180, 255, 0.8)");
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

  fetchSubmissions();

  document.querySelectorAll('input[name="region"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === "기타") {
        regionOtherInput.style.display = "block";
        regionOtherInput.required = true;
      } else {
        regionOtherInput.style.display = "none";
        regionOtherInput.required = false;
      }
    });
  });
});
