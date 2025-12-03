// --- 1. CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZIKC5xmseY0mkJAHNs8e_XJYcw1ctBRiryPBclcxKQHZvoMfAJtb2u8Gj5tp1wp8/exec"; // Keep your existing URL

// REMOVE THE HARDCODED "const churchData = [...]"
// We will fill this variable from the cloud now.
let churchData = []; 

// --- 2. INITIALIZATION (LOAD DATA) ---
async function initApp() {
    // Show Loading State
    const container = document.getElementById('group-buttons-container');
    container.innerHTML = '<p style="text-align:center; margin-top:20px;">목장을 불러오고 있습니다...<br>(잠시만 기달려주세요)</p>';

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        churchData = data; // Save the cloud data to our variable
        renderGroupButtons(); // Now draw the buttons
        
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red; text-align:center;">Error loading data.<br>Check internet connection.</p>';
    }
}

// Start the App
initApp();

// --- 2. STATE MANAGEMENT ---
let currentGroup = null; // Which group are we looking at?
let attendanceSession = {}; // Stores the choices: { 101: {status: 'Present', reason: ''} }

// Setup Date
const today = new Date();
document.getElementById('today-date').innerText = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
});

// --- 3. INITIALIZATION (LOBBY) ---
function renderGroupButtons() {
    const container = document.getElementById('group-buttons-container');
    container.innerHTML = '';
    
    churchData.forEach((group, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-group';
        btn.innerText = group.groupName;
        btn.onclick = () => openGroup(index);
        container.appendChild(btn);
    });
}

// --- 4. NAVIGATION (Updated with Memory) ---
function openGroup(index) {
    currentGroup = churchData[index];
    
    // NEW: Try to load today's saved session from phone memory
    // (This requires the helper function added in Change C)
    const savedSession = localStorage.getItem('attendance_cache_' + getTodayDateString());
    
    if (savedSession) {
        attendanceSession = JSON.parse(savedSession);
    } else {
        attendanceSession = {}; // No memory for today, start fresh
    }
    
    // Switch Screens
    document.getElementById('view-groups').classList.add('hidden');
    document.getElementById('view-members').classList.remove('hidden');
    
    // Set Header
    document.getElementById('group-name-display').innerText = currentGroup.groupName;
    
    renderMembers();
}

function goHome() {
    document.getElementById('view-groups').classList.remove('hidden');
    document.getElementById('view-members').classList.add('hidden');
}

// --- 5. RENDER MEMBERS ---
function renderMembers() {
    const container = document.getElementById('member-list');
    container.innerHTML = '';

    currentGroup.members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        
        // History Graph Logic
        let historyHTML = '<div class="history-container">';
        member.history.forEach(h => {
            historyHTML += `<div class="history-segment ${h ? 'present-seg' : 'absent-seg'}" style="flex:1"></div>`;
        });
        historyHTML += '</div>';

        card.innerHTML = `
            <div class="card-top">
                <span class="name">${member.name}</span>
                <a href="tel:${member.phone}" class="btn-call">📞 Call</a>
            </div>
            ${historyHTML}
            <div class="action-row">
                <button id="btn-att-${member.id}" onclick="selectStatus(${member.id}, 'Present')" class="btn-attend">출석</button>
                <button id="btn-abs-${member.id}" onclick="selectStatus(${member.id}, 'Absent')" class="btn-absent">결석</button>
            </div>
            <div id="reason-display-${member.id}" style="margin-top:10px; color: red; font-style: italic;"></div>
        `;
        container.appendChild(card);
    });
}

// --- 6. SELECTION LOGIC ---
function selectStatus(id, status) {
    // ... (Your existing UI code for removing classes) ...
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
    
    // NEW: Save to Phone Memory immediately
    saveLocalMemory();
}
}

// --- 7. MODAL LOGIC ---
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
    // If closed without saving, maybe reset button? For now, we leave it.
}

function saveAbsence() {
    const reason = reasonInput.value;
    if (currentModalId) {
        attendanceSession[currentModalId] = { status: 'Absent', reason: reason };
        document.getElementById(`reason-display-${currentModalId}`).innerText = `Reason: ${reason}`;
    }
    closeModal();
}

// --- 8. SUBMIT LOGIC (BATCH SEND) ---
function submitAttendance() {
    const totalMembers = currentGroup.members.length;
    const markedMembers = Object.keys(attendanceSession).length;

    if (markedMembers < totalMembers) {
        if(!confirm(`You only marked ${markedMembers} out of ${totalMembers} people. Submit anyway?`)) {
            return;
        }
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;

    // 1. Prepare the Box (The Payload)
    const dateText = document.getElementById('today-date').innerText;
    const payload = [];

    // Pack everyone into the box
    for (const [id, data] of Object.entries(attendanceSession)) {
        const member = currentGroup.members.find(m => m.id == id);
        payload.push({
            date: dateText,
            name: member.name,
            status: data.status,
            reason: data.reason
        });
    }

    // 2. Send the Box ONCE
    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // Changed to text/plain to avoid CORS preflight issues
        body: JSON.stringify({ attendanceList: payload })
    }).then(() => {
        alert("Attendance Saved Successfully!");
        goHome();
        btn.innerText = originalText;
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        alert("Error saving data. Please try again.");
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// Start










