
const API_BASE_URL = ''; 

async function login(schoolName, authCode) {
  console.log('Attempting login...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ schoolName, authCode })
    });

    const result = await response.json();
    console.log('Login response from our server (full object):', JSON.parse(JSON.stringify(result))); 
    console.log('Server response status (response.ok):', response.ok);
    console.log('Server result.success:', result.success);
    console.log('Server result.accessToken:', result.accessToken); 

    if (response.ok && result.success && result.accessToken) { 
      localStorage.setItem('zermeloUserId', result.userId);
      localStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('zermeloAccessToken', result.accessToken);
      
      console.log('Stored user ID in localStorage:', result.userId);
      console.log('Stored Zermelo access token in sessionStorage.');
      window.location.href = '/index.html'; 
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error occurred' };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');
  const loginText = document.getElementById('login-text');
  const loginSpinner = document.getElementById('login-spinner');

  if (!loginForm || !errorMessage || !loginBtn) {
    console.error('Login page: Required DOM elements not found for form handling.');
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    if (loginText) loginText.style.display = 'none';
    if (loginSpinner) loginSpinner.style.display = 'flex';
    errorMessage.style.display = 'none';

    const formData = new FormData(e.target);
    const schoolName = formData.get('schoolName')?.trim();
    const authCode = formData.get('authCode')?.trim();
    if (schoolName) localStorage.setItem('schoolName', schoolName);

    
    if (!schoolName || !authCode) {
      errorMessage.textContent = 'Please enter both school name and authentication code.';
      errorMessage.style.display = 'block';
      resetLoadingState();
      return;
    }

    try {
      const result = await login(schoolName, authCode);
      
      if (!result.success) {
        errorMessage.textContent = result.error || 'Login failed. Please check details and try again.';
        errorMessage.style.display = 'block';
      }
      
    } catch (error) {
      console.error('Login form submission error:', error);
      errorMessage.textContent = 'An unexpected error occurred. Please try again.';
      errorMessage.style.display = 'block';
    } finally {
      resetLoadingState();
    }
  });

  function resetLoadingState() {
    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');
    if (loginText) loginText.style.display = 'inline';
    if (loginSpinner) loginSpinner.style.display = 'none';
  }

  loginForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !loginBtn.disabled) {
      if (loginForm.checkValidity()) { 
        loginBtn.click(); 
      } 
    }
  });
});
