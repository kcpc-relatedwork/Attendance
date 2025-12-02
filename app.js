// --- 1. CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_SCRIPT_URL_HERE"; // <--- PASTE YOUR URL

// DATA STRUCTURE: Groups containing Members
const churchData = [
    {
        groupName: "1 실크웨이브",
        members: [
            { id: 101, name: "Kim (김철수)", phone: "555-0001", history: [1,1,1] },
            { id: 102, name: "Lee (이영희)", phone: "555-0002", history: [0,1,1] }
        ]
    },
    {
        groupName: "2 포도나무",
        members: [
            { id: 201, name: "Park (박지성)", phone: "555-0003", history: [1,1,0] },
            { id: 202, name: "Choi (최민수)", phone: "555-0004", history: [1,1,1] }
        ]
    }
];

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

// --- 4. NAVIGATION ---
function openGroup(index) {
    currentGroup = churchData[index];
    attendanceSession = {}; // Reset choices
    
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

// --- 6. SELECTION LOGIC (Changes color, saves to memory) ---
function selectStatus(id, status) {
    // UI Update
    document.getElementById(`btn-att-${id}`).classList.remove('active');
    document.getElementById(`btn-abs-${id}`).classList.remove('active');

    if (status === 'Present') {
        document.getElementById(`btn-att-${id}`).classList.add('active');
        // Save to memory
        attendanceSession[id] = { status: 'Present', reason: '' };
        document.getElementById(`reason-display-${id}`).innerText = '';
    } else {
        document.getElementById(`btn-abs-${id}`).classList.add('active');
        openModal(id); // Logic to capture reason
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

// --- 8. SUBMIT LOGIC (The Batch Send) ---
function submitAttendance() {
    // Validation: Did they check everyone?
    const totalMembers = currentGroup.members.length;
    const markedMembers = Object.keys(attendanceSession).length;

    if (markedMembers < totalMembers) {
        if(!confirm(`You only marked ${markedMembers} out of ${totalMembers} people. Submit anyway?`)) {
            return;
        }
    }

    const btn = document.querySelector('.btn-submit');
    btn.innerText = "Sending...";
    btn.disabled = true;

    // Send data one by one (Simple method to keep Apps Script same)
    const promises = [];
    
    for (const [id, data] of Object.entries(attendanceSession)) {
        const member = currentGroup.members.find(m => m.id == id);
        promises.push(sendToGoogleSheet(member.name, data.status, data.reason));
    }

    Promise.all(promises).then(() => {
        alert("Attendance Saved Successfully!");
        goHome();
        btn.innerText = "✅ Submit Attendance";
        btn.disabled = false;
    }).catch(err => {
        alert("Error saving data. Please try again.");
        btn.innerText = "✅ Submit Attendance";
        btn.disabled = false;
    });
}

// Helper to talk to Google
function sendToGoogleSheet(name, status, reason) {
    const dateText = document.getElementById('today-date').innerText;
    const data = { date: dateText, name: name, status: status, reason: reason };

    return fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
}

// Start
renderGroupButtons();
