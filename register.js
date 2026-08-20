/* ===== 注册新账号（本地数据层版：POST /api/register，注册成功后自动登录） ===== */
(function () {
  'use strict';

  const I18N = {
    zh: {
      regTitle: '创建账号',
      regSub: '注册后即可登录资源库',
      username: '用户名',
      regUserPH: '设定用户名（至少 2 位）',
      password: '密码',
      regPassPH: '设定密码（至少 4 位）',
      confirm: '确认密码',
      confirmPH: '再次输入密码',
      remember: '记住我（下次免登录）',
      regBtn: '注册并登录',
      back: '← 返回登录',
      errUserMin: '用户名至少需要 2 位',
      errPassMin: '密码至少需要 4 位',
      errMismatch: '两次输入的密码不一致',
      errDup: '该用户名已被注册',
      errNet: '无法连接服务器，请检查接口地址或稍后再试'
    },
    en: {
      regTitle: 'Create account',
      regSub: 'Register to sign in to the library',
      username: 'Username',
      regUserPH: 'Choose a username (min 2 chars)',
      password: 'Password',
      regPassPH: 'Set password (min 4 chars)',
      confirm: 'Confirm password',
      confirmPH: 'Re-enter password',
      remember: 'Remember me (stay signed in)',
      regBtn: 'Register & sign in',
      back: '← Back to sign in',
      errUserMin: 'Username must be at least 2 characters',
      errPassMin: 'Password must be at least 4 characters',
      errMismatch: 'Passwords do not match',
      errDup: 'That username is already taken',
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
    document.title = (lang === 'zh' ? '注册' : 'Register') + ' · Zelm 的信息资源库';
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

  const regForm = document.getElementById('registerForm');
  const regError = document.getElementById('regError');
  const regUser = document.getElementById('regUser');
  const regPass = document.getElementById('regPass');
  const regPass2 = document.getElementById('regPass2');
  const rememberEl = document.getElementById('remember');
  const submitBtn = regForm.querySelector('button[type="submit"]');

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.hidden = true;
    const u = regUser.value.trim();
    const p = regPass.value;
    const p2 = regPass2.value;
    if (u.length < 2) { showErr(regError, t('errUserMin')); return; }
    if (p.length < 4) { showErr(regError, t('errPassMin')); return; }
    if (p !== p2) { showErr(regError, t('errMismatch')); return; }

    submitBtn.disabled = true;
    try {
      await ZELM.req('POST', '/api/register', { username: u, password: p });
      // 注册成功 → 自动登录
      const data = await ZELM.req('POST', '/api/login', { username: u, password: p });
      ZELM.saveAuth(data.token, data.role, rememberEl.checked);
      sessionStorage.setItem('zelm_just_logged_in', '1');
      window.location.replace('index.html');
    } catch (err) {
      if (err.message && err.message.indexOf('已存在') >= 0) showErr(regError, t('errDup'));
      else showErr(regError, err.message || t('errNet'));
    } finally {
      submitBtn.disabled = false;
    }
  });

  applyLang();
})();
