
const OUR_API_BASE_URL_POMODORO = ''; 

class PomodoroTimer {
    constructor() {
        this.displayElement = document.getElementById('pomodoro-display');
        this.startPauseButton = document.getElementById('pomodoro-start-pause-btn');
        this.resetButton = document.getElementById('pomodoro-reset-btn');
        this.presetButtons = document.querySelectorAll('.pomodoro-preset');

        this.timerInterval = null;
        this.totalSeconds = 25 * 60; 
        this.currentSeconds = this.totalSeconds;
        this.isRunning = false;
        this.pomodorosCompleted = 0;
        this.totalStudySecondsAccumulated = 0; 
        this.activeSessionOriginalDuration = 0; 
        this.lastDisplayedQuarterHours = 0.0; 

        this.pomodorosCompletedDisplay = document.getElementById('pomodoros-stats-display');
        this.studyHoursDisplay = document.getElementById('study-hours-display');

        window.pomodoroTimerInstance = this; 

        this.loadStateFromLocalStorage(); 
        this.setupEventListeners();
    }

    initializeStatsDisplay(pomodoroTodayData) {
        console.log("PomodoroTimer: initializeStatsDisplay called with", pomodoroTodayData);
        const todayStr = new Date().toISOString().split('T')[0];

        if (pomodoroTodayData && pomodoroTodayData.date === todayStr) {
            this.pomodorosCompleted = parseInt(pomodoroTodayData.completedPomodoros, 10) || 0;
            this.totalStudySecondsAccumulated = parseInt(pomodoroTodayData.studySeconds, 10) || 0;
        } else {
            this.pomodorosCompleted = 0;
            this.totalStudySecondsAccumulated = 0;
        }

        const actualHours = Math.max(0, this.totalStudySecondsAccumulated / 3600);
        const initialQuarterHours = Math.floor(actualHours * 4) / 4;
        this.lastDisplayedQuarterHours = initialQuarterHours;
        
        if (this.studyHoursDisplay) {
            this.studyHoursDisplay.textContent = initialQuarterHours.toFixed(2);
        }
        this.updatePomodorosCompletedDisplay();
    }

    saveStateToLocalStorage() {
        const state = {
            currentSeconds: this.currentSeconds,
            isRunning: this.isRunning,
            totalSeconds: this.totalSeconds,
            pomodorosCompleted: this.pomodorosCompleted,
            totalStudySecondsAccumulated: this.totalStudySecondsAccumulated,
            activeSessionOriginalDuration: this.activeSessionOriginalDuration,
            lastDisplayedQuarterHours: this.lastDisplayedQuarterHours,
            lastSavedTimestamp: Date.now()
        };
        localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
    }

    loadStateFromLocalStorage() {
        const savedState = localStorage.getItem('pomodoroTimerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.totalSeconds = state.totalSeconds || (25 * 60);
            this.currentSeconds = state.currentSeconds;
            this.pomodorosCompleted = state.pomodorosCompleted || 0; 
            this.totalStudySecondsAccumulated = state.totalStudySecondsAccumulated || 0;
            this.activeSessionOriginalDuration = state.activeSessionOriginalDuration || this.totalSeconds;
            
            const loadedActualHours = Math.max(0, this.totalStudySecondsAccumulated / 3600);
            this.lastDisplayedQuarterHours = typeof state.lastDisplayedQuarterHours === 'number' ? state.lastDisplayedQuarterHours : Math.floor(loadedActualHours * 4) / 4;

            const wasRunning = state.isRunning;
            if (wasRunning && state.lastSavedTimestamp) {
                const timeElapsedSinceSave = Math.floor((Date.now() - state.lastSavedTimestamp) / 1000);
                if (timeElapsedSinceSave > 0) {
                    this.currentSeconds -= timeElapsedSinceSave;
                }
                if (this.currentSeconds < 0) {
                    this.totalStudySecondsAccumulated += this.activeSessionOriginalDuration; 
                    this.pomodorosCompleted++; 
                    this.currentSeconds = this.totalSeconds; 
                    this.isRunning = false; 
                } else {
                    this.isRunning = true; 
                }
            } else {
                 this.isRunning = state.isRunning || false;
            }
            
            if (this.isRunning) {
                if(this.startPauseButton) {
                    this.startPauseButton.textContent = 'Pause';
                    this.startPauseButton.classList.replace('btn-primary', 'btn-secondary');
                }
                this.setPresetButtonsDisabled(true);
                if (this.timerInterval) clearInterval(this.timerInterval);
                this.timerInterval = setInterval(() => this.tick(), 1000);
            } else {
                if(this.startPauseButton) {
                    this.startPauseButton.textContent = 'Start';
                    this.startPauseButton.classList.replace('btn-secondary', 'btn-primary');
                }
                this.setPresetButtonsDisabled(this.currentSeconds !== this.totalSeconds && this.currentSeconds > 0); 
            }
        } else {
            
            this.totalSeconds = 25 * 60;
            this.currentSeconds = this.totalSeconds;
            this.isRunning = false;
            this.pomodorosCompleted = 0;
            this.totalStudySecondsAccumulated = 0;
            this.activeSessionOriginalDuration = this.totalSeconds;
            this.lastDisplayedQuarterHours = 0.0; 
        }
        this.updateDisplay(); 
        this.updatePomodorosCompletedDisplay();
        if (this.studyHoursDisplay) {
            this.studyHoursDisplay.textContent = this.lastDisplayedQuarterHours.toFixed(2);
        }
    }

    setupEventListeners() {
        if(this.startPauseButton) this.startPauseButton.addEventListener('click', () => this.toggleTimer());
        if(this.resetButton) this.resetButton.addEventListener('click', () => this.resetTimer());
        if(this.presetButtons) {
            this.presetButtons.forEach(button => {
                button.addEventListener('click', (e) => this.selectPreset(e.target));
            });
        }
        window.addEventListener('beforeunload', () => this.saveStateToLocalStorage());
    }

    selectPreset(selectedButton) {
        if (this.isRunning || (this.currentSeconds !== this.totalSeconds && this.currentSeconds > 0 && this.currentSeconds < this.totalSeconds) ) {
            return;
        }
        if(this.presetButtons) this.presetButtons.forEach(btn => btn.classList.remove('active'));
        selectedButton.classList.add('active');
        this.totalSeconds = parseInt(selectedButton.dataset.time) * 60;
        this.currentSeconds = this.totalSeconds;
        this.activeSessionOriginalDuration = this.currentSeconds;
        this.isRunning = false; 
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        if(this.startPauseButton) {
            this.startPauseButton.textContent = 'Start';
            this.startPauseButton.classList.replace('btn-secondary','btn-primary');
        }
        this.setPresetButtonsDisabled(false);
        this.updateDisplay();
        this.saveStateToLocalStorage();
    }
    
    tick() {
        this.currentSeconds--;
        this.updateDisplay();

        if (this.currentSeconds < 0) {
            this.isRunning = false;
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.currentSeconds = 0; 
            this.updateDisplay();
            this.reportPomodoroCompletion(this.activeSessionOriginalDuration);
            this.resetTimerToCurrentPreset(false); 
            this.saveStateToLocalStorage(); 
        }
    }

    async reportPomodoroCompletion(sessionDurationSeconds) {
        console.log(`PomodoroTimer: Reporting completion of session: ${sessionDurationSeconds}s`);
        
        this.totalStudySecondsAccumulated += sessionDurationSeconds;
        this.pomodorosCompleted++;
        
        this.updatePomodorosCompletedDisplay();
        this.updateStudyHoursDisplay(); 
        this.saveStateToLocalStorage(); 
        
        let userId = null;
        if (window.auth && window.auth.currentZermeloUserId) {
            userId = window.auth.currentZermeloUserId;
        }

        if (!userId) {
            console.warn("PomodoroTimer: Cannot report completion to server, user not authenticated.");
            return; 
        }

        try {
            const response = await fetch(`${OUR_API_BASE_URL_POMODORO}/api/user/${userId}/pomodoro/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionStudySeconds: sessionDurationSeconds })
            });

            const result = await response.json();
            if (response.ok && result.success && result.pomodoroToday) {
                console.log("PomodoroTimer: Server acknowledged completion. Syncing stats:", result.pomodoroToday);
                this.pomodorosCompleted = result.pomodoroToday.completedPomodoros;
                this.totalStudySecondsAccumulated = result.pomodoroToday.studySeconds;
                
                const serverActualHours = Math.max(0, this.totalStudySecondsAccumulated / 3600);
                const serverQuarterHours = Math.floor(serverActualHours * 4) / 4;
                this.lastDisplayedQuarterHours = serverQuarterHours;
                
                this.updatePomodorosCompletedDisplay();
                this.updateStudyHoursDisplay(); 
            } else {
                console.error("PomodoroTimer: Server error or unsuccessful response for completion", result);
            }
        } catch (error) {
            console.error("PomodoroTimer: Network error reporting pomodoro completion to server:", error);
        }
        this.saveStateToLocalStorage(); 
    }

    toggleTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            if(this.startPauseButton) {
                this.startPauseButton.textContent = 'Start';
                this.startPauseButton.classList.replace('btn-secondary', 'btn-primary');
            }
            this.setPresetButtonsDisabled(true); 
        } else {
            if (this.currentSeconds <= 0) { 
                this.resetTimerToCurrentPreset(true);
            }
            this.activeSessionOriginalDuration = this.currentSeconds; 
            this.isRunning = true;
            if(this.startPauseButton) {
                this.startPauseButton.textContent = 'Pause';
                this.startPauseButton.classList.replace('btn-primary', 'btn-secondary');
            }
            this.setPresetButtonsDisabled(true); 

            if (this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => this.tick(), 1000);
        }
        this.saveStateToLocalStorage(); 
    }

    resetTimer() {
        this.isRunning = false; 
        if (this.timerInterval) { 
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.resetTimerToCurrentPreset(true); 
        const actualHours = Math.max(0, this.totalStudySecondsAccumulated / 3600);
        this.lastDisplayedQuarterHours = Math.floor(actualHours * 4) / 4;
        if(this.studyHoursDisplay) this.studyHoursDisplay.textContent = this.lastDisplayedQuarterHours.toFixed(2);
        this.updatePomodorosCompletedDisplay(); 
        this.saveStateToLocalStorage();
    }
    
    resetTimerToCurrentPreset(enablePresets = true) {
        const activeButton = document.querySelector('.pomodoro-preset.active');
        let defaultTimeMinutes = 25; 
        if (activeButton && activeButton.dataset.time) {
            defaultTimeMinutes = parseInt(activeButton.dataset.time);
        }
        this.totalSeconds = defaultTimeMinutes * 60;
        this.currentSeconds = this.totalSeconds;
        this.activeSessionOriginalDuration = this.totalSeconds;
        this.updateDisplay();
        
        if(this.startPauseButton) {
            this.startPauseButton.textContent = 'Start';
            this.startPauseButton.classList.replace('btn-secondary', 'btn-primary');
        }
        this.isRunning = false; 
        if (enablePresets) {
            this.setPresetButtonsDisabled(false);
        } else {
             this.setPresetButtonsDisabled(true);
        }
    }

    updatePomodorosCompletedDisplay() {
        if (this.pomodorosCompletedDisplay) {
            this.pomodorosCompletedDisplay.textContent = this.pomodorosCompleted;
        }
    }

    updateStudyHoursDisplay() {
        if (!this.studyHoursDisplay) return;

        const actualTotalHours = Math.max(0, this.totalStudySecondsAccumulated / 3600);
        const newDisplayableQuarterHours = Math.floor(actualTotalHours * 4) / 4;

        if (newDisplayableQuarterHours !== this.lastDisplayedQuarterHours) {
            this.studyHoursDisplay.textContent = newDisplayableQuarterHours.toFixed(2);
            this.lastDisplayedQuarterHours = newDisplayableQuarterHours;
        } else if (this.totalStudySecondsAccumulated === 0 && parseFloat(this.studyHoursDisplay.textContent) !== 0.00) {
            this.studyHoursDisplay.textContent = "0.00";
            this.lastDisplayedQuarterHours = 0.0;
        } else if (this.totalStudySecondsAccumulated > 0 && newDisplayableQuarterHours === this.lastDisplayedQuarterHours && parseFloat(this.studyHoursDisplay.textContent) !== parseFloat(newDisplayableQuarterHours.toFixed(2))){
             this.studyHoursDisplay.textContent = newDisplayableQuarterHours.toFixed(2);
        }
    }

    setPresetButtonsDisabled(disabled) {
        if(this.presetButtons) {
            this.presetButtons.forEach(button => {
                button.disabled = disabled;
            });
        }
    }

    updateDisplay() {
        if (!this.displayElement) return;
        const minutes = Math.floor(Math.max(0, this.currentSeconds) / 60);
        const seconds = Math.max(0, this.currentSeconds) % 60;
        this.displayElement.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pomodoro-display') && document.getElementById('pomodoro-start-pause-btn')) { 
        new PomodoroTimer(); 
    }
});
