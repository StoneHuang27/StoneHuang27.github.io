// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: admin-users.js
// Purpose: User button click handler
// ============================================================

// ===== USER BUTTON HANDLER =====
function handleUserBtnClick() {
  const role = getCurrentRole();
  if (role === 'guest') {
    openAppModal('upgrade');
  } else {
    switchToPage('user');
  }
}
