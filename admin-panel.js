/* ===== 管理员后台（本地数据层版：GET/POST /api/users*） ===== */
(function () {
  'use strict';

  const I18N = {
    zh: {
      panelTitle: '管理后台',
      panelSub: '查看用户、重置密码或删除账号',
      userCount: '共 {n} 位用户',
      backSite: '← 返回资源库',
      colUsername: '用户名',
      colActions: '操作',
      loading: '加载中…',
      empty: '暂无用户',
      reset: '重置密码',
      delete: '删除账号',
      resetConfirm: '确定将用户「{u}」的密码重置为 1234 吗？',
      deleteConfirm: '确定删除用户「{u}」吗？此操作不可撤销！',
      resetDone: '已重置：{u} 的密码为 1234',
      deleteDone: '已删除用户：{u}',
      errNet: '无法连接服务器，请检查接口地址或稍后再试',
      badgeAdmin: '管理员'
    },
    en: {
      panelTitle: 'Admin Panel',
      panelSub: 'View users, reset passwords or delete accounts',
      userCount: '{n} user(s)',
      backSite: '← Back to library',
      colUsername: 'Username',
      colActions: 'Actions',
      loading: 'Loading…',
      empty: 'No users yet',
      reset: 'Reset password',
      delete: 'Delete account',
      resetConfirm: 'Reset password for "{u}" to 1234?',
      deleteConfirm: 'Delete user "{u}"? This cannot be undone!',
      resetDone: 'Reset: {u} password is now 1234',
      deleteDone: 'Deleted user: {u}',
      errNet: 'Cannot reach server. Check API address or try again later.',
      badgeAdmin: 'Admin'
    }
  };

  let lang = 'zh';
  try {
    const s = JSON.parse(localStorage.getItem('zelm_settings'));
    if (s && s.lang) lang = s.lang;
  } catch (e) {}
  const t = k => (I18N[lang] && I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.zh[k]);
  const fmt = (str, obj) => str.replace(/\{([^}]+)\}/g, (_, k) => obj[k] !== undefined ? obj[k] : '');

  function applyLang() {
    const d = I18N[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (d[el.dataset.i18n] !== undefined) el.textContent = d[el.dataset.i18n];
    });
    document.title = (lang === 'zh' ? '管理后台' : 'Admin Panel') + ' · Zelm 的信息资源库';
  }

  // 星光
  const starField = document.getElementById('starField');
  if (starField) {
    let html = '';
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * 100, y = Math.random() * 100;
      const s = 1 + Math.random() * 2, d = (Math.random() * 3).toFixed(2);
      html += `<span class="star-dot" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${d}s"></span>`;
    }
    starField.innerHTML = html;
  }

  // 非管理员直接回管理员登录页
  if (!ZELM.isAdmin()) {
    window.location.replace('admin.html');
    return;
  }

  const userTableBody = document.getElementById('userTableBody');
  const userCount = document.getElementById('userCount');
  const toast = document.getElementById('adminToast');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function renderUsers() {
    userTableBody.innerHTML = `<tr><td colspan="2" class="admin-empty">${t('loading')}</td></tr>`;
    let users = [];
    try {
      const data = await ZELM.req('GET', '/api/users');
      users = data.users || [];
    } catch (e) {
      userTableBody.innerHTML = `<tr><td colspan="2" class="admin-empty">${escapeHtml(e.message || t('errNet'))}</td></tr>`;
      return;
    }
    userCount.textContent = fmt(t('userCount'), { n: users.length });
    userTableBody.innerHTML = '';

    if (users.length === 0) {
      userTableBody.innerHTML = `<tr><td colspan="2" class="admin-empty">${t('empty')}</td></tr>`;
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      const badge = u.role === 'admin'
        ? ` <span class="role-badge">${t('badgeAdmin')}</span>` : '';
      tr.innerHTML = `
        <td>${escapeHtml(u.username)}${badge}</td>
        <td class="user-actions">
          <button class="btn-reset" data-action="reset" data-id="${u.id}" data-user="${escapeHtml(u.username)}">${t('reset')}</button>
          <button class="btn-delete" data-action="delete" data-id="${u.id}" data-user="${escapeHtml(u.username)}">${t('delete')}</button>
        </td>
      `;
      userTableBody.appendChild(tr);
    });

    userTableBody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const username = btn.dataset.user;
        const action = btn.dataset.action;
        try {
          if (action === 'reset') {
            if (!confirm(fmt(t('resetConfirm'), { u: username }))) return;
            await ZELM.req('POST', '/api/users/reset', { id });
            showToast(fmt(t('resetDone'), { u: username }));
          } else if (action === 'delete') {
            if (!confirm(fmt(t('deleteConfirm'), { u: username }))) return;
            await ZELM.req('POST', '/api/users/delete', { id });
            showToast(fmt(t('deleteDone'), { u: username }));
          }
          renderUsers();
        } catch (e) {
          alert(e.message || t('errNet'));
        }
      });
    });
  }

  applyLang();
  renderUsers();
})();
