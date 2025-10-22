// =======================================================
// 전역 변수 설정
// =======================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec"; // ★★★ 고객님께서 제공하신 API_URL ★★★
const SUBMISSIONS_KEY = 'petSurveySubmissions';
let submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || [];
let regionChart = null; // 지역 분포 차트 객체
let priceChart = null;  // 지불 의향 금액 차트 객체

// =======================================================
// DOM 로드 완료 후 초기화 함수
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환 기능 초기화
    initTabs();
    
    // 지역 '기타' 입력 필드 활성화/비활성화
    initRegionInput();
    
    // 저장된 제출 목록 렌더링 및 차트 초기 생성
    renderSubmissions();
    updateCharts(); // ★ 차트 초기화 및 생성 (작동하도록 수정됨) ★
    
    // 폼 제출 이벤트 리스너
    document.getElementById('petSurveyForm').addEventListener('submit', handleFormSubmit);
});

// =======================================================
// 탭 전환 기능
// =======================================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            
            // 모든 버튼 비활성화, 클릭된 버튼 활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 모든 패널 숨김, 타겟 패널 표시
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            // 제출 목록 탭으로 이동 시 차트 업데이트
            if (targetId === 'submissions') {
                updateCharts();
            }
        });
    });
}

// =======================================================
// 지역 '기타' 입력 로직
// =======================================================
function initRegionInput() {
    const regionRadios = document.querySelectorAll('input[name="region"]');
    const regionOtherInput = document.querySelector('input[name="regionOther"]');

    regionRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === '기타') {
                regionOtherInput.style.display = 'block';
                regionOtherInput.setAttribute('required', 'required');
            } else {
                regionOtherInput.style.display = 'none';
                regionOtherInput.removeAttribute('required');
                regionOtherInput.value = ''; 
            }
        });
    });
}

// =======================================================
// 폼 제출 처리 함수 (Google Apps Script 연동)
// =======================================================
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const msgElement = document.getElementById('msg');
    
    // 로딩 메시지
    msgElement.textContent = '⏳ 제출 중...';
    msgElement.style.color = '#ff9f43';
    
    // 폼 데이터를 Google Apps Script 형식에 맞게 준비
    const submissionData = {};
    for (const [key, value] of formData.entries()) {
        if (key === 'region' && value === '기타' && formData.get('regionOther')) {
            // '기타' 지역의 경우, 직접 입력 값을 사용
            submissionData[key] = formData.get('regionOther'); 
        } else if (key !== 'regionOther') {
            submissionData[key] = value;
        }
    }
    if (submissionData.region === '기타' && !formData.get('regionOther')) {
        submissionData.region = '기타';
    }

    // FormData를 URLSearchParams로 변환하여 fetch에 전달
    const params = new URLSearchParams();
    for (const key in submissionData) {
        params.append(key, submissionData[key]);
    }

    // API_URL을 사용하여 데이터 전송 (Google Apps Script)
    fetch(API_URL, { // ★★★ API_URL 변수 사용 ★★★
        method: 'POST',
        body: params,
        mode: 'no-cors' // Google Script에 데이터를 전송할 때 CORS 문제 방지
    })
    .then(response => {
        // 'no-cors' 모드에서는 응답 상태를 확인할 수 없으므로,
        // 에러가 발생하지 않으면 성공으로 간주하고 로컬 처리 진행
        
        // 로컬 저장소 및 차트 업데이트
        submissions.push(submissionData);
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

        // 성공 메시지 표시
        msgElement.textContent = '✅ 설문이 성공적으로 제출되었습니다!';
        msgElement.style.color = 'lime';
        
        // 폼 초기화
        form.reset();
        document.querySelector('input[name="regionOther"]').style.display = 'none';

        // 제출 목록 및 차트 업데이트
        renderSubmissions();
        updateCharts();
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        msgElement.textContent = '❌ 제출 실패. 네트워크 또는 스크립트 연결을 확인하세요.';
        msgElement.style.color = '#ff4d4f';
    });
}

// =======================================================
// 제출 목록 렌더링 함수 (로컬 데이터 사용)
// =======================================================
function renderSubmissions() {
    const listElement = document.getElementById('submissionsList');
    listElement.innerHTML = ''; 

    if (submissions.length === 0) {
        listElement.innerHTML = '<div class="placeholder">제출된 기록이 없습니다.</div>';
        return;
    }

    // 최신 제출 순으로 역순 정렬하여 보여줍니다.
    [...submissions].reverse().forEach((sub) => { 
        const recordDiv = document.createElement('div');
        recordDiv.className = 'record';
        
        // 각 답변을 형식에 맞게 표시
        recordDiv.innerHTML = `
            <div><strong>지역:</strong> ${sub.region || '-'}</div>
            <div><strong>반려동물:</strong> ${sub.hasPet || '-'}</div>
            <div><strong>우선 기준:</strong> ${sub.priorityCriteria || '-'}</div>
            <div><strong>지불 의향:</strong> ${sub.priceRange || '-'}</div>
            <div><strong>응급 정보 1순위:</strong> ${sub.priority1 || '-'}</div>
            <div><strong>우려점/필요 기능:</strong> ${sub.concernAndFeature ? sub.concernAndFeature.substring(0, 50) + '...' : '-'}</div>
        `;
        
        listElement.appendChild(recordDiv);
    });
}


// =======================================================
// ★★★ 차트 업데이트/생성 함수 (로컬 데이터 사용) ★★★
// =======================================================
function updateCharts() {
    if (submissions.length === 0) {
        // 데이터가 없으면 차트를 지웁니다.
        if (regionChart) regionChart.destroy();
        if (priceChart) priceChart.destroy();
        return;
    }

    // 1. 지역 분포 데이터 집계
    const regionCounts = submissions.reduce((acc, item) => {
        const region = item.region || '미응답'; 
        acc[region] = (acc[region] || 0) + 1;
        return acc;
    }, {});
    
    const regionLabels = Object.keys(regionCounts);
    const regionData = Object.values(regionCounts);
    
    // 2. 지불 의향 금액 데이터 집계
    const priceOrder = ["50만원 미만", "50만원 ~ 100만원", "100만원 ~ 200만원", "200만원 이상", "미응답"];
    const priceCounts = submissions.reduce((acc, item) => {
        const price = item.priceRange || '미응답';
        acc[price] = (acc[price] || 0) + 1;
        return acc;
    }, {});

    const priceLabels = priceOrder.filter(label => Object.keys(priceCounts).includes(label));
    const priceData = priceLabels.map(label => priceCounts[label] || 0);

    // =======================================================
    // 차트 생성 (기존 차트가 있으면 제거 후 재생성)
    // =======================================================
    // =======================================================
    // 차트 생성 (기존 차트가 있으면 제거 후 재생성)
    // =======================================================

    // 1. 지역 분포 차트 (도넛 차트)
    const ctxRegion = document.getElementById('regionChart').getContext('2d');
    if (regionChart) regionChart.destroy(); 
    regionChart = new Chart(ctxRegion, {
        type: 'doughnut',
        data: {
            labels: regionLabels,
            datasets: [{
                data: regionData,
                backgroundColor: ['#ff4d4f', '#ff9f43', '#1e90ff', '#7fff00', '#aaaaaa'], 
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: 'white' } 
                },
                title: {
                    display: false,
                }
            }
        }
    });

    // 2. 지불 의향 금액 차트 (막대 차트)
    const ctxPrice = document.getElementById('priceChart').getContext('2d');
    if (priceChart) priceChart.destroy(); 
    priceChart = new Chart(ctxPrice, {
        type: 'bar',
        data: {
            labels: priceLabels,
            datasets: [{
                label: '응답자 수',
                data: priceData,
                backgroundColor: '#ff4d4f', 
                borderColor: '#ff4d4f',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white', 
                        stepSize: 1, 
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' } 
                },
                x: {
                    ticks: { color: 'white' }, 
                    grid: { display: false } 
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    });
}
