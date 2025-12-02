// --- 1. CONFIGURATION (EDIT THIS LIST) ---
const members = [
    { 
        id: 1, 
        name: "Elder Kim (김철수)", 
        phone: "555-123-4567",
        // 1 = Present, 0 = Absent (Last 12 weeks mock data)
        history: [1,1,1,0,1,1,1,1,1,0,1,1] 
    },
    { 
        id: 2, 
        name: "Deacon Lee (이영희)", 
        phone: "555-987-6543",
        history: [1,0,0,1,1,0,1,1,1,1,1,1] 
    },
    { 
        id: 3, 
        name: "Jason Park", 
        phone: "555-555-5555",
        history: [0,0,1,1,1,1,1,1,1,1,1,1] 
    }
];

// --- 2. SETUP ---
const container = document.getElementById('member-list');
const dateElement = document.getElementById('today-date');

// Set Date Header
const today = new Date();
dateElement.innerText = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
});

// --- 3. RENDER THE LIST ---
function renderMembers() {
    container.innerHTML = ''; // Clear current list

    members.forEach(member => {
        // Create Card
        const card = document.createElement('div');
        card.className = 'member-card';

        // 1. Generate History Bar (Visual Graph)
        // This calculates the width of green/red segments based on history
        let historyHTML = '<div class="history-container">';
        member.history.forEach(status => {
            const className = status === 1 ? 'present-seg' : 'absent-seg';
            historyHTML += `<div class="history-segment ${className}" style="flex:1"></div>`;
        });
        historyHTML += '</div>';

        // 2. Build Card HTML
        card.innerHTML = `
            <div class="card-top">
                <span class="name">${member.name}</span>
                <a href="tel:${member.phone}" class="btn-call">
                    📞 Contact
                </a>
            </div>
            
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Recent Attendance (3 months):</div>
            ${historyHTML}

            <div class="action-row">
                <button id="btn-att-${member.id}" onclick="markAttendance(${member.id}, 'present')" class="btn-attend">
                    출석 (Present)
                </button>
                <button id="btn-abs-${member.id}" onclick="markAttendance(${member.id}, 'absent')" class="btn-absent">
                    결석 (Absent)
                </button>
            </div>
            <div id="reason-display-${member.id}" style="margin-top:10px; color: red; font-style: italic;"></div>
        `;

        container.appendChild(card);
    });
}

// --- 4. INTERACTION LOGIC ---
let currentMemberId = null;

function markAttendance(id, status) {
    // Reset buttons visuals
    document.getElementById(`btn-att-${id}`).classList.remove('active');
    document.getElementById(`btn-abs-${id}`).classList.remove('active');
    document.getElementById(`reason-display-${id}`).innerText = '';

    if (status === 'present') {
        document.getElementById(`btn-att-${id}`).classList.add('active');
        // In a real app, we would send "Present" to the database here
    } else {
        document.getElementById(`btn-abs-${id}`).classList.add('active');
        // Open the Pop-up for reason
        openModal(id);
    }
}
// --- FIXED MODAL LOGIC ---

const modal = document.getElementById('absence-modal');
const reasonInput = document.getElementById('absence-reason');
const modalName = document.getElementById('modal-member-name');

function openModal(id) {
    currentMemberId = id;
    const member = members.find(m => m.id === id);
    modalName.innerText = `Absence Reason: ${member.name}`;
    reasonInput.value = ''; // Clear previous text
    
    // CHANGE: We now ADD the class 'show' to make it visible
    modal.classList.add('show'); 
}

function closeModal() {
    // CHANGE: We REMOVE the class 'show' to hide it
    modal.classList.remove('show');
}

function saveAbsence() {
    const reason = reasonInput.value;
    if (currentMemberId) {
        // Show reason on the card
        const display = document.getElementById(`reason-display-${currentMemberId}`);
        display.innerText = `Reason: ${reason}`;
        
        // Optional: Mark the absent button as active if not already
        document.getElementById(`btn-abs-${currentMemberId}`).classList.add('active');
    }
    closeModal();
}

// Initial Run
renderMembers();

