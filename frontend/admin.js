// admin.js — Admin frontend controller (API-driven)

// Import API functions
import { adminLogin, adminSetup, adminForgotPassword, adminResetPassword } from './api.js';

// ======= DOM Elements =======
const loginForm = document.getElementById('adminLoginForm');
const setupForm = document.getElementById('adminSetupForm');
const forgotForm = document.getElementById('adminForgotForm');
const resetForm = document.getElementById('adminResetForm');

// ======= Helper Notification =======
function showNotification(msg, type = 'info') {
  const notif = document.createElement('div');
  notif.className = `floatingNotification ${type}`;
  notif.innerText = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ======= Admin Login =======
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();
  if (!username || !password) return showNotification('All fields required', 'error');

  try {
    const res = await adminLogin(username, password);
    if (res.success) {
      showNotification('✅ Login successful!', 'success');
      // Example: save token/session if needed
      sessionStorage.setItem('adminToken', res.token);
      window.location.href = 'dashboard.html'; // redirect to admin dashboard
    } else {
      showNotification(res.message || 'Login failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Server error during login', 'error');
  }
});

// ======= Admin Setup =======
setupForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const password = setupForm.password.value.trim();
  if (!password) return showNotification('Enter a password', 'error');

  try {
    const res = await adminSetup(password);
    if (res.success) {
      showNotification('✅ Admin setup complete!', 'success');
      setupForm.reset();
    } else {
      showNotification(res.message || 'Setup failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Server error during setup', 'error');
  }
});

// ======= Forgot Password =======
forgotForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = forgotForm.email.value.trim();
  if (!email) return showNotification('Enter email', 'error');

  try {
    const res = await adminForgotPassword(email);
    if (res.success) {
      showNotification('✅ Reset link sent to your email!', 'success');
      forgotForm.reset();
    } else {
      showNotification(res.message || 'Failed to send reset link', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Server error during password reset', 'error');
  }
});

// ======= Reset Password =======
resetForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const token = resetForm.token.value.trim();
  const newPassword = resetForm.newPassword.value.trim();
  if (!token || !newPassword) return showNotification('All fields required', 'error');

  try {
    const res = await adminResetPassword(token, newPassword);
    if (res.success) {
      showNotification('✅ Password reset successfully!', 'success');
      resetForm.reset();
      window.location.href = 'login.html'; // redirect to login
    } else {
      showNotification(res.message || 'Password reset failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Server error during password reset', 'error');
  }
});

// ======= Optional: Check if admin is already logged in =======
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('adminToken');
  if (token && window.location.pathname.includes('login.html')) {
    window.location.href = 'dashboard.html';
  }
});
