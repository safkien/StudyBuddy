
const OUR_API_BASE_URL_INTERACTIONS = ''; 

const studyTips = [
    { title: "Clear Goals", text: "Set a clear goal before each study session." },
    { title: "Time Blocking", text: "Break large tasks into 25-minute blocks; rest for five." },
    { title: "Minimize Distractions", text: "Remove your phone from arm’s reach." },
    { title: "Quick Review", text: "Review notes within 24 hours to cement memory." },
    { title: "Teach It", text: "Teach a concept out loud to test understanding." },
    { title: "Self-Quizzing", text: "Quiz yourself instead of rereading." },
    { title: "Context Matching", text: "Study in the same type of room where you’ll take the test." },
    { title: "Consistent Review", text: "Schedule short daily reviews instead of one marathon session." },
    { title: "Hardest First", text: "Tackle the hardest subject first while fresh." },
    { title: "Question Sheet", text: "Keep a “question sheet” for anything you need to ask later." },
    { title: "Sparingly Highlight", text: "Highlight sparingly—no more than one sentence per paragraph." },
    { title: "Spaced Repetition", text: "Use spaced repetition apps for vocabulary or formulas." },
    { title: "Simple Diagrams", text: "Create simple diagrams instead of long paragraphs." },
    { title: "Close Tabs", text: "Close every tab you aren’t using." },
    { title: "Explain Simply", text: "Explain tough ideas to a classmate in plain language." },
    { title: "Timed Practice", text: "Test with past exam papers under timed conditions." },
    { title: "Micro-Deadlines", text: "Set micro-deadlines for each chapter." },
    { title: "Stay Hydrated", text: "Drink water every hour; dehydration harms focus." },
    { title: "Read Summaries First", text: "Read summaries before diving into full texts." },
    { title: "Use Subtitles", text: "Turn subtitles on when watching lecture videos." },
    { title: "Healthy Snacks", text: "Keep snacks high in protein, low in sugar." },
    { title: "Manage Noise", text: "Use noise-blocking headphones or white-noise tracks." },
    { title: "Vary Study Spots", text: "Change study spots once a week to reduce boredom." },
    { title: "Visible Targets", text: "Post your weekly targets on a wall calendar." },
    { title: "One-Sentence Summaries", text: "Check understanding by writing one-sentence summaries." },
    { title: "Purposeful Color-Coding", text: "Use color coding for different themes, not decoration." },
    { title: "Problem Grouping", text: "Group similar problems and solve them back-to-back." },
    { title: "Mark Confusion", text: "Mark confusing pages with sticky notes for quick return." },
    { title: "Single Tasking", text: "Avoid multitasking; focus on one task at a time." },
    { title: "Quick Recap", text: "Start sessions with a quick recap of the last one." },
    { title: "Formula Sheet", text: "Keep reference formulas on one A4 sheet for rapid glance." },
    { title: "Record & Replay", text: "Record yourself explaining a process; replay to spot gaps." },
    { title: "Questions First", text: "Turn headings into questions before reading a chapter." },
    { title: "Good Posture", text: "Sit up straight; slouching reduces alertness." },
    { title: "Milestone Rewards", text: "Reward finished milestones with a short walk." },
    { title: "Plain Paper Mind Maps", text: "Use plain paper for mind maps; avoid cramped digital screens." },
    { title: "Handwritten Notes", text: "Write key facts by hand to improve recall speed." },
    { title: "Study Partner Check-ins", text: "Schedule weekly catch-ups with a study partner." },
    { title: "Consistent Sleep", text: "Keep a consistent sleep schedule; memory builds overnight." },
    { title: "Test Recall First", text: "Test recall before looking at the answer key." },
    { title: "Compress Notes", text: "Compress lecture notes to half their length each pass." },
    { title: "Draft Exam Questions", text: "Draft possible exam questions as you read." },
    { title: "Visible Progress", text: "Check off completed tasks; visible progress boosts morale." },
    { title: "Clean Desk", text: "Keep the desk free of non-study items." },
    { title: "Timer Apps", text: "Use timer apps that lock distracting sites." },
    { title: "Start Early", text: "Start assignments the day they’re issued, even for ten minutes." },
    { title: "Mistake Log", text: "Track errors in a “mistake log” and review them weekly." },
    { title: "Stretch Breaks", text: "Stretch shoulders and neck every study break." },
    { title: "Lecture Flashcards", text: "Summarize each lecture on one flashcard." },
    { title: "Plan Next Steps", text: "End sessions by planning the next step; reduces decision fatigue." }
];

function displayRandomStudyTip() {
    const tipSection = document.querySelector('.study-tip');
    if (tipSection) {
        const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
        const titleElement = tipSection.querySelector('.study-tip-title');
        const textElement = tipSection.querySelector('.study-tip-text');

        const escapeHtml = (unsafe) => {
            if (unsafe === null || typeof unsafe === 'undefined') return '';
            return String(unsafe) 
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }

        if (titleElement && textElement) {
            titleElement.innerHTML = `💡 ${escapeHtml(randomTip.title)}`;
            textElement.innerHTML = escapeHtml(randomTip.text);
        } else {
            // Fallback if the structure is slightly different
            tipSection.innerHTML = `
                <div>
                  <p class="study-tip-title">💡 ${escapeHtml(randomTip.title)}</p>
                  <p class="study-tip-text">${escapeHtml(randomTip.text)}</p>
                </div>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.study-tip')) {
        displayRandomStudyTip();
    }

    const addEventModal = document.getElementById('addEventModal');
    const floatingAddEventBtn = document.getElementById('floatingAddEventBtn');
    const closeEventModalBtn = document.getElementById('closeEventModalBtn');
    const addEventForm = document.getElementById('addEventForm');

    if (floatingAddEventBtn && addEventModal) {
        floatingAddEventBtn.addEventListener('click', () => {
            addEventModal.style.display = 'flex';
            const eventDateInput = document.getElementById('eventDate');
            if(eventDateInput && window.scheduleManager && window.scheduleManager.currentDate){
                try {
                    const year = window.scheduleManager.currentDate.getFullYear();
                    const month = String(window.scheduleManager.currentDate.getMonth() + 1).padStart(2, '0');
                    const day = String(window.scheduleManager.currentDate.getDate()).padStart(2, '0');
                    eventDateInput.value = `${year}-${month}-${day}`;
                } catch (e) {
                    console.warn("Could not prefill event date from scheduleManager.currentDate", e);
                    // Fallback to today if scheduleManager date is invalid
                    const today = new Date();
                    eventDateInput.value = today.toISOString().split('T')[0];
                }
            } else {
                 const today = new Date();
                 eventDateInput.value = today.toISOString().split('T')[0];
            }
        });
    }

    if (closeEventModalBtn && addEventModal) {
        closeEventModalBtn.addEventListener('click', () => {
            addEventModal.style.display = 'none';
        });
    }

    if (addEventForm && addEventModal) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('eventTitle').value;
            const date = document.getElementById('eventDate').value;
            const startTime = document.getElementById('eventStartTime').value;
            const endTime = document.getElementById('eventEndTime').value;
            const description = document.getElementById('eventDescription').value;

            const newEvent = {
                title: title, 
                subject: title, 
                description: description,
                startTime: `${date}T${startTime}:00`, 
                endTime: `${date}T${endTime}:00`,
                location: 'Custom Event',
                isCustomEvent: true 
            };

            console.log("DashboardInteractions: Attempting to save new custom event:", newEvent);
            const userId = localStorage.getItem('zermeloUserId');
            if (!userId) {
                alert("Error: Not logged in. Cannot save event.");
                addEventModal.style.display = 'none';
                addEventForm.reset();
                return;
            }

            try {
                const response = await fetch(`${OUR_API_BASE_URL_INTERACTIONS}/api/user/${userId}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newEvent)
                });

                const savedEventResult = await response.json(); 

                if (!response.ok) {
                    throw new Error(savedEventResult.message || savedEventResult.error || 'Failed to save event to server');
                }
                
                console.log('DashboardInteractions: Event saved successfully to server:', savedEventResult);

                if (window.scheduleManager && typeof window.scheduleManager.addCustomEventToDisplay === 'function') {
                    window.scheduleManager.addCustomEventToDisplay(savedEventResult.data || newEvent); 
                } else {
                    console.warn("scheduleManager not found or addCustomEventToDisplay method missing. Schedule might not update immediately.");
                }
            } catch (error) {
                console.error("DashboardInteractions: Error saving custom event:", error);
                alert("Error saving event: " + error.message);
            } finally {
                addEventModal.style.display = 'none';
                addEventForm.reset();
            }
        });
    }

    if (addEventModal) {
        window.addEventListener('click', (event) => {
            if (event.target === addEventModal && addEventModal.style.display === 'flex') {
                addEventModal.style.display = 'none';
            }
        });
    }

    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("DashboardInteractions: logout button clicked.");
            if (window.auth && typeof window.auth.logout === 'function') {
                window.auth.logout(); 
            } else {
                console.warn('DashboardInteractions: window.auth.logout method not found. Using basic localStorage clear and redirect.');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('zermeloUserId');
                localStorage.removeItem('zermeloAccessToken');
                localStorage.removeItem('schoolName');
                localStorage.removeItem('currentUserDataFromDB'); // From auth.js
                localStorage.removeItem('pomodoroTimerState'); // From pomodoroTimer.js
                if (window.location.pathname !== '/login.html') {
                     window.location.href = '/login.html';
                }
            }
        });
    }
});
