/* ===== 用户登录（本地数据层版：POST /api/login） ===== */
(function () {
  'use strict';

  const I18N = {
    zh: {
      loginTitle: '用户登录',
      loginSub: '登录后继续收集星光',
      username: '用户名',
      usernamePH: '输入用户名',
      password: '密码',
      passwordPH: '输入密码',
      remember: '记住我（下次免登录）',
      loginBtn: '登 录',
      noAccount: '还没有账号？注册一个',
      adminLink: '管理员登录 →',
      errEmpty: '请输入用户名和密码',
      errWrong: '用户名或密码不正确',
      errNet: '无法连接服务器，请检查接口地址或稍后再试'
    },
    en: {
      loginTitle: 'Sign in',
      loginSub: 'Sign in to keep collecting starlight',
      username: 'Username',
      usernamePH: 'Enter username',
      password: 'Password',
      passwordPH: 'Enter password',
      remember: 'Remember me (stay signed in)',
      loginBtn: 'SIGN IN',
      noAccount: "No account yet? Create one",
      adminLink: 'Admin sign in →',
      errEmpty: 'Please enter username and password',
      errWrong: 'Incorrect username or password',
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
    document.title = (lang === 'zh' ? '登录' : 'Sign in') + ' · Zelm 的信息资源库';
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

  // 登录
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const rememberEl = document.getElementById('remember');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const u = usernameEl.value.trim();
    const p = passwordEl.value;
    if (!u || !p) { showErr(loginError, t('errEmpty')); return; }
    submitBtn.disabled = true;
    try {
      const data = await ZELM.req('POST', '/api/login', { username: u, password: p });
      ZELM.saveAuth(data.token, data.role, rememberEl.checked);
      sessionStorage.setItem('zelm_just_logged_in', '1');
      window.location.replace('index.html');
    } catch (err) {
      showErr(loginError, (err && err.status === 401) ? t('errWrong') : (err.message || t('errNet')));
    } finally {
      submitBtn.disabled = false;
    }
  });

  applyLang();
})();
