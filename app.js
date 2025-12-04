// --- 1. CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZIKC5xmseY0mkJAHNs8e_XJYcw1ctBRiryPBclcxKQHZvoMfAJtb2u8Gj5tp1wp8/exec"; 

// Container for our data
let churchData = []; 

// --- 2. INITIALIZATION (LOAD DATA) ---
async function initApp() {
    const container = document.getElementById('group-buttons-container');
    container.innerHTML = '<p style="text-align:center; margin-top:20px;">목장을 불러오고 있습니다...<br>(잠시만 기달려주세요)</p>';

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        churchData = data; 
        renderGroupButtons(); 
        
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오지 못했습니다.<br>인터넷 연결을 확인해주세요.</p>';
    }
}

// Start the App
initApp();

// --- 3. STATE MANAGEMENT ---
let currentGroup = null; 
let attendanceSession = {}; 

// Setup Date
const today = new Date();
document.getElementById('today-date').innerText = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
});

// --- 4. RENDER GROUP BUTTONS (LOBBY) ---
function renderGroupButtons() {
    const container = document.getElementById('group-buttons-container');
    container.innerHTML = '';
    
    // Peek into memory
    const savedSessionStr = localStorage.getItem('attendance_cache_' + getTodayDateString());
    const savedSession = savedSessionStr ? JSON.parse(savedSessionStr) : {};

    churchData.forEach((group, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-group';
        
        // Check if started
        const isStarted = group.members.some(member => savedSession[member.id]);

        const statusIcon = isStarted 
            ? '<span style="color:#28a745; font-size:1.5rem;">✅</span>' 
            : '<span style="color:#ccc; font-size:2rem; line-height:0;">›</span>';

        btn.innerHTML = `<span>${group.groupName}</span> ${statusIcon}`;
        btn.onclick = () => openGroup(index);
        container.appendChild(btn);
    });
}

// --- 5. NAVIGATION ---
function openGroup(index) {
    currentGroup = churchData[index];
    
    // Load Memory
    const savedSession = localStorage.getItem('attendance_cache_' + getTodayDateString());
    if (savedSession) {
        attendanceSession = JSON.parse(savedSession);
    } else {
        attendanceSession = {}; 
    }
    
    // Switch Screens
    document.getElementById('view-groups').classList.add('hidden');
    document.getElementById('view-members').classList.remove('hidden');
    document.getElementById('group-name-display').innerText = currentGroup.groupName;
    
    renderMembers();
}

function goHome() {
    document.getElementById('view-groups').classList.remove('hidden');
    document.getElementById('view-members').classList.add('hidden');
    // Refresh buttons to show checkmarks
    renderGroupButtons();
}

// --- 6. RENDER MEMBER LIST ---
function renderMembers() {
    const container = document.getElementById('member-list');
    container.innerHTML = '';

    currentGroup.members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        
        // History Graph
        let historyHTML = '<div class="history-container">';
        member.history.forEach(h => {
            historyHTML += `<div class="history-segment ${h ? 'present-seg' : 'absent-seg'}" style="flex:1"></div>`;
        });
        historyHTML += '</div>';

        // Check Memory
        const savedData = attendanceSession[member.id];
        let presentClass = 'btn-attend';
        let absentClass = 'btn-absent';
        let reasonText = '';

        if (savedData) {
            if (savedData.status === 'Present') presentClass += ' active';
            if (savedData.status === 'Absent') {
                absentClass += ' active';
                reasonText = savedData.reason ? `사유: ${savedData.reason}` : '';
            }
        }

        card.innerHTML = `
            <div class="card-top">
                <span class="name">${member.name}</span>
                <a href="tel:${member.phone}" class="btn-call">📞 Call</a>
            </div>
            ${historyHTML}
            <div class="action-row">
                <button id="btn-att-${member.id}" onclick="selectStatus(${member.id}, 'Present')" class="${presentClass}">출석</button>
                <button id="btn-abs-${member.id}" onclick="selectStatus(${member.id}, 'Absent')" class="${absentClass}">결석</button>
            </div>
            <div id="reason-display-${member.id}" style="margin-top:10px; color: #d9534f; font-weight:bold;">${reasonText}</div>
        `;
        container.appendChild(card);
    });
}

// --- 7. SELECTION LOGIC ---
function selectStatus(id, status) {
    document.getElementById(`btn-att-${id}`).classList.remove('active');
    document.getElementById(`btn-abs-${id}`).classList.remove('active');

    if (status === 'Present') {
        document.getElementById(`btn-att-${id}`).classList.add('active');
        attendanceSession[id] = { status: 'Present', reason: '' };
        document.getElementById(`reason-display-${id}`).innerText = '';
    } else {
        document.getElementById(`btn-abs-${id}`).classList.add('active');
        openModal(id);
    }
    
    saveLocalMemory();
}

// --- 8. MODAL LOGIC ---
const modal = document.getElementById('absence-modal');
const reasonInput = document.getElementById('absence-reason');
const modalName = document.getElementById('modal-member-name');
let currentModalId = null;

function openModal(id) {
    currentModalId = id;
    const member = currentGroup.members.find(m => m.id === id);
    modalName.innerText = member.name;
    reasonInput.value = '';
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

function saveAbsence() {
    const reason = reasonInput.value;
    if (currentModalId) {
        attendanceSession[currentModalId] = { status: 'Absent', reason: reason };
        document.getElementById(`reason-display-${currentModalId}`).innerText = `사유: ${reason}`;
        saveLocalMemory();
    }
    closeModal();
}

// --- 9. SUBMIT LOGIC ---
function submitAttendance() {
    const totalMembers = currentGroup.members.length;
    const markedMembers = Object.keys(attendanceSession).length;

    if (markedMembers < totalMembers) {
        if(!confirm(`아직 ${totalMembers - markedMembers}명이 체크되지 않았습니다. 그래도 제출하시겠습니까?`)) {
            return;
        }
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = "보내는중...";
    btn.disabled = true;

    const dateText = document.getElementById('today-date').innerText;
    const payload = [];

    for (const [id, data] of Object.entries(attendanceSession)) {
        const member = currentGroup.members.find(m => m.id == id);
        payload.push({
            date: dateText,
            name: member.name,
            status: data.status,
            reason: data.reason
        });
    }

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ attendanceList: payload })
    }).then(() => {
        alert("출석체크 완료!");
        goHome();
        btn.innerText = originalText;
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        alert("오류 발생. 다시 시도해주세요.");
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// --- 10. HELPERS ---
function saveLocalMemory() {
    localStorage.setItem('attendance_cache_' + getTodayDateString(), JSON.stringify(attendanceSession));
}

function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
