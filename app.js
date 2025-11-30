// CONFIGURATION: Add your groups here
const groups = [
    {
        name: "1 실크웨이브 목장 (김의철)",
        // The main link to the form (ends in viewform)
        formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScfbWO5f2JSMlnhIkSjsjD2Zb423WMGc2s_Kx9drn53-j-hcQ/viewform?usp=dialog",
        // The ID for the date field (optional - remove if you don't want auto-date)
        dateEntryId: "entry.2066914496"
    },
    {
        name: "2 포도나무",
        formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdHnnuMT34cABWrxsfKwhWU5ANRY7B4VSkntXplC5uIT9AxLg/viewform?usp=dialog",
        dateEntryId: "entry.2066914496"
    },
    ];

// 1. Display Today's Date in the Header
const dateDisplay = document.getElementById('date-display');
const today = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
dateDisplay.innerText = today.toLocaleDateString('en-US', options);

// 2. Helper function to format date as YYYY-MM-DD (Google Forms format)
function getFormattedDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 3. Render Buttons
const container = document.getElementById('group-list');

groups.forEach(group => {
    const button = document.createElement('button');
    button.className = 'group-card';
    button.innerText = group.name;
    
    button.onclick = () => {
        let finalUrl = group.formUrl;
        
        // If we have a date ID, append the current date param
        if (group.dateEntryId) {
            const dateStr = getFormattedDate();
            // Check if URL already has query params
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += `${separator}${group.dateEntryId}=${dateStr}`;
        }
        
        // Open in new tab (standard mobile behavior)
        window.open(finalUrl, '_blank');
    };

    container.appendChild(button);

});
