const OUR_API_BASE_URL = '';

class StudyBuddyAuth {
    constructor() {
        console.log('StudyBuddyAuth instance created.');
        this.currentZermeloUserId = null;
        this.currentUserData = null; 
        this.isAuthenticated = false;
    }

    async checkAuth() {
        console.log('Auth: checkAuth() called.');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userIdFromStorage = localStorage.getItem('zermeloUserId');

        if (isLoggedIn === 'true' && userIdFromStorage) {
            console.log(`Auth: Found loggedInUser ${userIdFromStorage} in localStorage.`);
            this.currentZermeloUserId = userIdFromStorage;
            this.isAuthenticated = true;
            return this.fetchAndProcessUserData(this.currentZermeloUserId);
        } else {
            console.log('Auth: User not found in localStorage. Redirecting to login.');
            this.redirectToLogin();
            return false;
        }
    }

    async fetchAndProcessUserData(userId) {
        console.log(`Auth: Fetching full user data for ${userId} from our server.`);
        try {
            const response = await fetch(`${OUR_API_BASE_URL}/api/user/${userId}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Auth: Failed to fetch user data from /api/user/${userId}: ${response.status}`, errorText);
                this.logout(); 
                return false;
            }
            this.currentUserData = await response.json();
            console.log('Auth: Successfully fetched user data from our server:', this.currentUserData);
            
            if (window.scheduleManager && typeof window.scheduleManager.initializeWithData === 'function') {
                
            }
            
            this.updateGlobalUI();

            if (this.currentUserData && this.currentUserData.pomodoroToday) {
                if (window.pomodoroTimerInstance && typeof window.pomodoroTimerInstance.initializeStatsDisplay === 'function') {
                    console.log("Auth: Initializing Pomodoro stats display with server data.", this.currentUserData.pomodoroToday);
                    window.pomodoroTimerInstance.initializeStatsDisplay(this.currentUserData.pomodoroToday);
                } else {
                }
            }
            return true;

        } catch (error) {
            console.error('Auth: Error in fetchAndProcessUserData:', error);
            this.logout(); 
            return false;
        }
    }
    
    updateGlobalUI() {
        console.log("Auth: User data is now available in window.auth.currentUserData", this.currentUserData);
    }

    logout() {
        console.log('Auth: logout() called.');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('zermeloUserId');
        localStorage.removeItem('currentUserDataFromDB');
        localStorage.removeItem('pomodoroTimerState');
        this.isAuthenticated = false;
        this.currentZermeloUserId = null;
        this.currentUserData = null;
        
        if (window.location.pathname !== '/login.html') {
             window.location.href = '/login.html';
        }
    }

    redirectToLogin() {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    async login(schoolName, authCode) {
        console.warn('Auth: login() method in auth.js was called, but login.html should POST directly to /auth/login on the server.');
        try {
            const response = await fetch(`${OUR_API_BASE_URL}/auth/login`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolName, authCode }) 
            });
            const result = await response.json();
            if (response.ok && result.success) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('zermeloUserId', result.userId); 
                this.currentZermeloUserId = result.userId;
                this.isAuthenticated = true;
                await this.fetchAndProcessUserData(result.userId); 
                if (window.location.pathname.includes('login.html')) {
                     window.location.href = '/index.html';
                }
                return { success: true };
            } else {
                return { success: false, error: result.error || 'Login failed via auth.js' };
            }
        } catch (error) {
            console.error('Login error in auth.js:', error);
            return { success: false, error: 'Network error occurred in auth.js login' };
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Auth: DOMContentLoaded event.');
    window.auth = new StudyBuddyAuth();

    if (!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('/')) {
        console.log('Auth: Protected page, attempting to checkAuth.');
        const authSuccess = await window.auth.checkAuth();
        if (authSuccess) {
            if (window.scheduleManager && typeof window.scheduleManager.setUserId === 'function') {
                window.scheduleManager.setUserId(window.auth.currentZermeloUserId);
            }
        }
    } else if(window.location.pathname.endsWith('/')) {
        
        console.log('Auth: Root page, attempting to checkAuth for potential auto-login flow.');
        await window.auth.checkAuth();
    } else {
        console.log('Auth: On login.html, auth check skipped initially by this script.');
    }

    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if(window.auth) {
                window.auth.logout();
            } else { 
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('zermeloUserId');
                window.location.href = '/login.html';
            }
        });
    }
});

