import { showToast } from './components/toast.js';

// Module-scoped state (in-memory only, no persistence)
let isAuthenticated = false;

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
export function checkAuth() {
  return isAuthenticated;
}

/**
 * Validate password against environment variable
 * @param {string} inputPassword - Password entered by user
 * @returns {boolean}
 */
export function validatePassword(inputPassword) {
  const correctPassword = import.meta.env.VITE_APP_PASSWORD;

  // Security check: ensure password is configured
  if (!correctPassword) {
    console.error('VITE_APP_PASSWORD not configured');
    return false;
  }

  return inputPassword === correctPassword;
}

/**
 * Set authentication state
 * @param {boolean} state
 */
export function setAuthenticated(state) {
  isAuthenticated = state;
}

/**
 * Show password prompt modal
 * @param {Function} onSuccess - Callback when authentication succeeds
 */
export function showPasswordPrompt(onSuccess) {
  const backdrop = document.getElementById('modal-backdrop');
  const modalContainer = document.getElementById('modal-container');

  // Show backdrop (non-dismissible - no click handler)
  backdrop.classList.remove('hidden');

  // Create password modal
  modalContainer.innerHTML = `
    <div class="modal auth-modal">
      <div class="modal-header">
        <h2>Authentication Required</h2>
      </div>
      <div class="modal-body">
        <p style="color:var(--muted);font-size:13px;margin-bottom:14px;">
          Please enter the password to access Playlister.
        </p>
        <div class="form-field">
          <label>Password</label>
          <input type="password" id="auth-password" placeholder="Enter password…" autofocus>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="auth-submit">Submit</button>
        </div>
      </div>
    </div>
  `;

  const passwordInput = modalContainer.querySelector('#auth-password');
  const submitBtn = modalContainer.querySelector('#auth-submit');

  function handleSubmit() {
    const inputPassword = passwordInput.value;

    if (!inputPassword) {
      showToast('Please enter a password', 'error', 2000);
      return;
    }

    if (validatePassword(inputPassword)) {
      setAuthenticated(true);
      modalContainer.innerHTML = '';
      backdrop.classList.add('hidden');
      onSuccess();
    } else {
      showToast('Incorrect password', 'error', 3000);
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  submitBtn.addEventListener('click', handleSubmit);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
}
