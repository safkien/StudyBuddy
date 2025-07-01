
const OUR_API_BASE_URL_SCHEDULE = ''; 


const colorMap = {
    'default': 'schedule-icon-gray' // A fallback color
};

class ScheduleManager {
    constructor() {
        this.currentDate = new Date();
        this.allAppointments = []; // Initialize allAppointments
        this.scheduleContainer = document.getElementById('schedule-container');
        this.datePicker = document.getElementById('datePicker');
        this.prevDateBtn = document.getElementById('prevDateBtn');
        this.nextDateBtn = document.getElementById('nextDateBtn');
        this.nextClassSubjectElement = document.getElementById('next-class-subject');
        this.nextClassTimeElement = document.getElementById('next-class-time');
        this.classesTodayCountElement = document.getElementById('classes-today-count');

        if (!this.scheduleContainer || !this.datePicker || !this.prevDateBtn || !this.nextDateBtn) {
            console.warn("ScheduleManager: Not all required UI elements found. Functionality might be limited.");
            return; 
        }

        this.initializeDatePicker();
        this.setupEventListeners();
        this.loadSchedule(); // 
        window.scheduleManager = this; 
    }

    initializeDatePicker() {
        this.datePicker.valueAsDate = this.currentDate;
    }

    setupEventListeners() {
        this.prevDateBtn.addEventListener('click', () => this.changeDate(-1));
        this.nextDateBtn.addEventListener('click', () => this.changeDate(1));
        this.datePicker.addEventListener('change', (e) => {
            this.currentDate = new Date(e.target.value);
            this.filterAndRenderSchedule(); 
        });
    }

    changeDate(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.datePicker.valueAsDate = this.currentDate;
        this.filterAndRenderSchedule(); 
    }

    async loadSchedule() {
        if (!this.scheduleContainer) return;
        this.scheduleContainer.innerHTML = '<div id="schedule-loading" class="text-center"><p>Loading schedule...</p></div>';

        const zermeloUserId = localStorage.getItem('zermeloUserId');
        const accessToken = sessionStorage.getItem('zermeloAccessToken'); 
        const schoolName = localStorage.getItem('schoolName'); 

        if (!zermeloUserId || !accessToken || !schoolName) {
            console.error('ScheduleManager: Missing user ID, access token, or school name. Cannot load schedule.');
            this.renderError("Authentication details missing. Please log in again.");
            if (window.auth && typeof window.auth.logout === 'function') {
                
            }
            return;
        }

        try {
            const todayForZermelo = new Date();
            const startDateForZermelo = new Date(todayForZermelo);
            startDateForZermelo.setDate(startDateForZermelo.getDate() - 14);
            const startDateEpoch = Math.floor(startDateForZermelo.getTime() / 1000);
            const endDateForZermelo = new Date(todayForZermelo);
            endDateForZermelo.setDate(endDateForZermelo.getDate() + 14); 
            const endDateEpoch = Math.floor(endDateForZermelo.getTime() / 1000);
            const zermeloApiUrl = `https://${schoolName.toLowerCase()}.zportal.nl/api/v3/appointments?user=~me&start=${startDateEpoch}&end=${endDateEpoch}&fields=id,start,end,subjects,teachers,locations,cancelled,valid,changeDescription,type,remark&access_token=${accessToken}`;
            
            console.log("ScheduleManager: Fetching Zermelo schedule from:", zermeloApiUrl);
            const zermeloResponse = await fetch(zermeloApiUrl);

            if (!zermeloResponse.ok) {
                let errorData = { error: 'Unknown Zermelo API error' };
                try { errorData = await zermeloResponse.json(); } catch (e) { errorData.error = await zermeloResponse.text(); }
                console.error('ScheduleManager: Failed to fetch Zermelo schedule data', zermeloResponse.status, errorData);
                if (zermeloResponse.status === 401) {
                    alert("Your Zermelo session may have expired. Please log in again.");
                    if (window.auth && typeof window.auth.logout === 'function') window.auth.logout();
                    return;
                }
                throw new Error(errorData.message || errorData.error || `Failed to fetch Zermelo schedule (status: ${zermeloResponse.status})`);
            }
            const zermeloScheduleData = await zermeloResponse.json();
            let zermeloAppointments = [];
            if (zermeloScheduleData.response && zermeloScheduleData.response.data) {
                zermeloAppointments = zermeloScheduleData.response.data.filter(app => app.valid && !app.cancelled);
            }
            console.log("ScheduleManager: Fetched and filtered Zermelo appointments:", zermeloAppointments);

            const ourServerResponse = await fetch(`${OUR_API_BASE_URL_SCHEDULE}/api/user/${zermeloUserId}`);
            if (!ourServerResponse.ok) {
                const errorText = await ourServerResponse.text();
                throw new Error(`Failed to fetch custom events from DB: ${ourServerResponse.status} ${errorText}`);
            }
            const ourUserData = await ourServerResponse.json();
            const customEvents = ourUserData.customEvents || [];
            console.log("ScheduleManager: Fetched custom events from DB:", customEvents);

            const processedZermeloAppointments = zermeloAppointments.map(app => ({
                ...app,
                startTime: new Date(app.start * 1000).toISOString(),
                endTime: new Date(app.end * 1000).toISOString(),
                subject: app.subjects && app.subjects.length > 0 ? app.subjects[0] : 'Event',
                location: app.locations && app.locations.length > 0 ? app.locations[0] : '-',
                teacher: app.teachers && app.teachers.length > 0 ? app.teachers[0] : '-',
                description: app.remark || app.changeDescription || ''
            }));

            const processedCustomEvents = customEvents.map(ce => ({
                ...ce,
                id: ce.id || ce._id || 'custom-' + Date.now() + Math.random(), 
                subject: ce.subject || ce.title,
                startTime: new Date(ce.startTime).toISOString(),
                endTime: new Date(ce.endTime).toISOString(),
                location: ce.location || 'Custom',
                teacher: ce.teacher || '-',
                description: ce.description || ''
            }));

            this.allAppointments = [...processedZermeloAppointments, ...processedCustomEvents];
            console.log("ScheduleManager: Combined allAppointments:", this.allAppointments);
            this.filterAndRenderSchedule();

        } catch (error) {
            console.error('ScheduleManager: Error loading combined schedule:', error);
            this.renderError(error.message);
        }
    }

    filterAndRenderSchedule() {
        if (!this.scheduleContainer) return;
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const scheduleForDate = this.allAppointments.filter(item => {
            return item.startTime && item.startTime.startsWith(dateStr);
        });

        scheduleForDate.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        this.renderSchedule(scheduleForDate);
        this.updateStats(scheduleForDate);
        
        const sortedAppointmentsForNextClass = this.allAppointments.slice().sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        this.updateNextClass(sortedAppointmentsForNextClass);
    }

    renderSchedule(scheduleData) {
        if (!this.scheduleContainer) return;
        if (!scheduleData || scheduleData.length === 0) {
            this.scheduleContainer.innerHTML = '<div class="text-center text-gray-500"><p>No classes or events scheduled for this day.</p></div>';
            return;
        }
        const scheduleHTML = scheduleData.map(item => this.createScheduleItem(item)).join('');
        this.scheduleContainer.innerHTML = scheduleHTML;
    }

    createScheduleItem(item) {
        const iconColor = this.getSubjectIconColor(item.subject);
        const startTime = this.formatTime(item.startTime);
        const endTime = this.formatTime(item.endTime);
        const duration = this.calculateDuration(item.startTime, item.endTime);

        return `
            <div class="schedule-item">
              <div class="flex space-x-3">
                <div class="schedule-icon ${iconColor}"></div>
                <div>
                  <p class="Subject-title">${this.escapeHtml(item.subject)}</p>
                  <span>${this.escapeHtml(item.location || '-')} • ${this.escapeHtml(item.teacher || '-')}</span>
                </div>
              </div>
              <div class="schedule-time">
                <p>${startTime} – ${endTime}</p>
                <span>${duration} minutes</span>
              </div>
            </div>
        `;
    }

    getSubjectIconColor(subject = '') {
        const subjectLower = subject.toLowerCase();
        
        return colorMap[subjectLower] || 'schedule-icon-gray'; 
    }

    formatTime(timeString) {
        if (!timeString) return '--:--';
        try {
            const date = new Date(timeString);
            return date.toLocaleTimeString(navigator.language, { hour12: false, hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return timeString; // Fallback
        }
    }

    calculateDuration(startTime, endTime) {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end - start;
            return Math.round(diffMs / (1000 * 60));
        } catch (error) {
            return 0; // Fallback
        }
    }

    updateStats(scheduleData) {
        const classesCount = scheduleData ? scheduleData.length : 0;
        if (this.classesTodayCountElement) {
            this.classesTodayCountElement.textContent = classesCount;
        }
    }

    updateNextClass(allAppointmentsSorted) {
        if (!this.nextClassSubjectElement || !this.nextClassTimeElement) return;

        if (!allAppointmentsSorted || allAppointmentsSorted.length === 0) {
            this.nextClassSubjectElement.textContent = 'No schedule data';
            this.nextClassTimeElement.textContent = '--:-- – --:--';
            return;
        }

        const now = new Date();
        const nextClass = allAppointmentsSorted.find(item => {
            if (!item.startTime) return false;
            const startTime = new Date(item.startTime);
            return startTime > now;
        });

        if (nextClass) {
            this.nextClassSubjectElement.textContent = this.escapeHtml(nextClass.subject);
            const startTimeFormatted = this.formatTime(nextClass.startTime);
            const endTimeFormatted = this.formatTime(nextClass.endTime);
            let datePrefix = "";
            const nextClassStartDate = new Date(nextClass.startTime);
            const currentDate = new Date();
            const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const nextClassDay = new Date(nextClassStartDate.getFullYear(), nextClassStartDate.getMonth(), nextClassStartDate.getDate());
            const diffTime = nextClassDay.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                datePrefix = "Today, ";
            } else if (diffDays === 1) {
                datePrefix = "Tomorrow, ";
            } else {
                datePrefix = nextClassStartDate.toLocaleDateString(navigator.language, { weekday: 'short', month: 'short', day: 'numeric' }) + ", ";
            }
            this.nextClassTimeElement.textContent = `${datePrefix}${startTimeFormatted} – ${endTimeFormatted}`;
        } else {
            this.nextClassSubjectElement.textContent = 'No upcoming classes';
            this.nextClassTimeElement.textContent = '--:-- – --:--';
        }
    }

    renderError(message = "Failed to load schedule") {
        if (!this.scheduleContainer) return;
        this.scheduleContainer.innerHTML = `
            <div class="text-center text-red-500">
              <p>${this.escapeHtml(message)}</p>
              <button class="btn btn-secondary mt-2" onclick="window.scheduleManager && window.scheduleManager.loadSchedule()">
                Retry
              </button>
            </div>
        `;
    }

    escapeHtml(text) {
        if (text === null || typeof text === 'undefined') return '';
        const div = document.createElement('div');
        div.textContent = String(text); // Ensure text is a string
        return div.innerHTML;
    }

    addCustomEventToDisplay(newEvent) {
        if (newEvent && newEvent.startTime) {
            const processedEvent = {
                ...newEvent,
                id: newEvent.id || newEvent._id || 'custom-' + Date.now() + Math.random(),
                subject: newEvent.subject || newEvent.title,
                startTime: new Date(newEvent.startTime).toISOString(),
                endTime: new Date(newEvent.endTime).toISOString(),
                location: newEvent.location || 'Custom',
                teacher: newEvent.teacher || '-',
                description: newEvent.description || ''
            };
            this.allAppointments.push(processedEvent);
            this.filterAndRenderSchedule();
        } else {
            console.warn("ScheduleManager: Attempted to add invalid custom event to display", newEvent);
        }
    }
}

// Initialize ScheduleManager when the DOM is ready, if the necessary elements exist
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('schedule-container')) { 
        new ScheduleManager();
    }
});
