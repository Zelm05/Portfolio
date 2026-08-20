/* ===== 管理员登录（本地数据层版：POST /api/login，校验 role === admin） ===== */
(function () {
  'use strict';

  const I18N = {
    zh: {
      adminTitle: '管理员登录',
      adminSub: '管理员入口，仅限授权账号',
      username: '管理员账号',
      usernamePH: '输入管理员账号',
      password: '密码',
      passwordPH: '输入管理员密码',
      remember: '记住我（下次免登录）',
      adminBtn: '登 录',
      backUser: '← 返回用户登录',
      errEmpty: '请输入管理员账号和密码',
      errWrong: '管理员账号或密码不正确',
      errNet: '无法连接服务器，请检查接口地址或稍后再试'
    },
    en: {
      adminTitle: 'Admin sign in',
      adminSub: 'Restricted entry for authorized admins',
      username: 'Admin account',
      usernamePH: 'Enter admin account',
      password: 'Password',
      passwordPH: 'Enter admin password',
      remember: 'Remember me (stay signed in)',
      adminBtn: 'SIGN IN',
      backUser: '← Back to user sign in',
      errEmpty: 'Please enter admin account and password',
      errWrong: 'Incorrect admin account or password',
      errNet: 'Cannot reach server. Check API address or try again later.'
    }
  };

  let lang = 'zh';
  try {
    const s = JSON.parse(localStorage.getItem('zelm_settings'));
    if (s && s.lang) lang = s.lang;
  } catch (e) {}
  const t = k => (I18N[lang] && I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.zh[k]);

  function applyLang() {
    const d = I18N[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (d[el.dataset.i18n] !== undefined) el.textContent = d[el.dataset.i18n];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      if (d[el.dataset.i18nPlaceholder] !== undefined) el.placeholder = d[el.dataset.i18nPlaceholder];
    });
    document.title = (lang === 'zh' ? '管理员登录' : 'Admin') + ' · Zelm 的信息资源库';
    document.querySelectorAll('#loginLang .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === lang));
  }

  document.querySelectorAll('#loginLang .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      try {
        const s = JSON.parse(localStorage.getItem('zelm_settings')) || {};
        s.lang = lang;
        localStorage.setItem('zelm_settings', JSON.stringify(s));
      } catch (e) {}
      applyLang();
    });
  });

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

  const adminForm = document.getElementById('adminForm');
  const adminError = document.getElementById('adminError');
  const adminUser = document.getElementById('adminUser');
  const adminPass = document.getElementById('adminPass');
  const rememberEl = document.getElementById('remember');
  const submitBtn = adminForm.querySelector('button[type="submit"]');

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminError.hidden = true;
    const u = adminUser.value.trim();
    const p = adminPass.value;
    if (!u || !p) { showErr(adminError, t('errEmpty')); return; }
    submitBtn.disabled = true;
    try {
      const data = await ZELM.req('POST', '/api/login', { username: u, password: p });
      if (data.role !== 'admin') {
        showErr(adminError, t('errWrong'));
        return;
      }
      ZELM.saveAuth(data.token, data.role, rememberEl.checked);
      sessionStorage.setItem('zelm_just_logged_in', '1');
      window.location.replace('index.html');
    } catch (err) {
      showErr(adminError, (err && err.status === 401) ? t('errWrong') : (err.message || t('errNet')));
    } finally {
      submitBtn.disabled = false;
    }
  });

  applyLang();
})();
