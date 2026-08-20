/* ===== Zelm 信息资源库 · 纯前端本地数据层（零后端） =====
 * 通过 ZELM.req(method, path, body) 提供与云端 Worker 完全一致的接口，
 * 但所有数据存于浏览器 localStorage，不依赖任何服务器。
 *
 * 用法：在 HTML 中先引入本文件（底部），再引入页面脚本（login.js / script.js 等）。
 * 前端调用方式不变：await ZELM.req('POST', '/api/login', { username, password }) 等。
 *
 * ⚠️ 数据为「浏览器本地存储」：换设备 / 换浏览器 / 清缓存都会丢失，各端不互通。
 *    这正是「纯前端版」的取舍——简单、无需服务器、国内任意静态托管（GitHub Pages /
 *    Cloudflare Pages）都能跑，但牺牲了多设备云端同步。
 *
 * 默认管理员：zelm / 050930（首次启动自动创建；若删除全部用户会再次自动重建）。
 */

const ZELM = {
  /* 读取当前登录态（兼容 index.html 守卫直接读 zelm_token） */
  token() {
    return localStorage.getItem('zelm_token') || sessionStorage.getItem('zelm_token');
  },
  role() {
    return localStorage.getItem('zelm_role') || sessionStorage.getItem('zelm_role') || 'user';
  },
  isAdmin() {
    return ZELM.role() === 'admin';
  },

  /* 保存登录态：remember=true 存 localStorage（记住登录），否则仅本次会话 */
  saveAuth(token, role, remember) {
    if (remember) {
      localStorage.setItem('zelm_token', token);
      localStorage.setItem('zelm_role', role);
      sessionStorage.removeItem('zelm_token');
      sessionStorage.removeItem('zelm_role');
    } else {
      sessionStorage.setItem('zelm_token', token);
      sessionStorage.setItem('zelm_role', role);
      localStorage.removeItem('zelm_token');
      localStorage.removeItem('zelm_role');
    }
  },

  clearAuth() {
    ['zelm_token', 'zelm_role', 'zelm_auth', 'zelm_auth_session', 'zelm_admin', 'zelm_admin_session']
      .forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  },

  headers() { return {}; },

  /* 统一请求封装：与云端版同签名，前端零改动 */
  async req(method, path, body) {
    const user = currentUser();
    const { status, body: result } = await dispatch(method, path, body || {}, user);
    if (status !== 200) {
      const err = new Error(result.error || ('请求失败（' + status + '）'));
      err.status = status;
      throw err;
    }
    return result;
  }
};
window.ZELM = ZELM;

/* ---------- 存储辅助 ---------- */
const LS = {
  users: 'zelm_users',
  comments: 'zelm_comments',
  likes: 'zelm_likes',
  feedback: 'zelm_feedback'
};
function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function nextId(arr) { return arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1; }

/* ---------- 编码 / 哈希 ---------- */
function b64u(bytes) {
  const arr = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return atob(b);
}
/* 密码哈希：优先 Web Crypto PBKDF2，不可用时降级到同步占位哈希（仅本地可见） */
function fallbackHash(password, salt) {
  let h = 5381;
  const s = password + ':' + salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return 'fb' + (h >>> 0).toString(16);
}
async function hashPassword(password, saltB64) {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.importKey) {
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
      return b64u(new Uint8Array(bits));
    } catch (e) { /* 降级 */ }
  }
  return fallbackHash(password, saltB64);
}
function randomSalt() {
  const a = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return b64u(a);
}

/* ---------- 登录令牌（本地 base64，无需签名） ---------- */
function makeToken(user) {
  return b64u(new TextEncoder().encode(JSON.stringify({ uid: user.id, username: user.username, role: user.role })));
}
function currentUser() {
  const t = ZELM.token();
  if (!t) return null;
  try {
    const p = JSON.parse(b64uDecode(t));
    if (!p || !p.uid) return null;
    return p;
  } catch (e) { return null; }
}

/* ---------- 默认管理员自动播种（首次无用户时） ---------- */
let _seeded = false;
async function ensureSeedAdmin() {
  if (_seeded) return;
  _seeded = true;
  const users = read(LS.users, []);
  if (users.length > 0) return;
  const salt = randomSalt();
  const hash = await hashPassword('050930', salt);
  users.push({ id: 1, username: 'zelm', pass_hash: hash, salt, role: 'admin', created_at: Date.now() });
  write(LS.users, users);
}

/* ---------- 路由分发（复刻 Worker 16 接口与返回结构） ---------- */
async function dispatch(method, path, body, user) {
  await ensureSeedAdmin();
  method = method.toUpperCase();
  const ok = (data) => ({ status: 200, body: data });
  const err = (msg, status = 400) => ({ status, body: { error: msg } });

  if (path === '/api/bootstrap') return ok({ ok: true, msg: '本地模式无需 bootstrap' });

  if (path === '/api/register' && method === 'POST') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username.length < 2 || username.length > 20) return err('用户名需 2~20 个字符');
    if (password.length < 4) return err('密码至少 4 位');
    const users = read(LS.users, []);
    if (users.some(u => u.username === username)) return err('用户名已存在');
    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    users.push({ id: nextId(users), username, pass_hash: hash, salt, role: 'user', created_at: Date.now() });
    write(LS.users, users);
    return ok({ ok: true });
  }

  if (path === '/api/login' && method === 'POST') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const users = read(LS.users, []);
    const u = users.find(x => x.username === username);
    if (!u) return err('用户名或密码错误', 401);
    const hash = await hashPassword(password, u.salt);
    if (hash !== u.pass_hash) return err('用户名或密码错误', 401);
    return ok({ token: makeToken(u), username: u.username, role: u.role });
  }

  if (path === '/api/me' && method === 'GET') {
    if (!user) return err('未登录', 401);
    return ok({ username: user.username, role: user.role });
  }

  if (path === '/api/comments' && method === 'GET') {
    const uid = user ? user.id : 0;
    const comments = read(LS.comments, []);
    const likes = read(LS.likes, []);
    const list = comments
      .slice()
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 200)
      .map(c => ({
        id: c.id, name: c.name, text: c.text, likes: c.likes || 0, created_at: c.created_at,
        liked: likes.some(l => l.user_id === uid && l.comment_id === c.id)
      }));
    return ok({ comments: list });
  }

  if (path === '/api/comments' && method === 'POST') {
    if (!user) return err('请先登录', 401);
    const text = String(body.text || '').trim().slice(0, 200);
    if (!text) return err('留言内容不能为空');
    const comments = read(LS.comments, []);
    const nc = { id: nextId(comments), user_id: user.id, name: user.username, text, likes: 0, created_at: Date.now() };
    comments.push(nc);
    write(LS.comments, comments);
    return ok({ ok: true, id: nc.id });
  }

  if (path === '/api/comments/like' && method === 'POST') {
    if (!user) return err('请先登录', 401);
    const cid = Number(body.id);
    if (!cid) return err('参数错误');
    const likes = read(LS.likes, []);
    if (!likes.some(l => l.user_id === user.id && l.comment_id === cid)) {
      likes.push({ user_id: user.id, comment_id: cid, created_at: Date.now() });
      write(LS.likes, likes);
    }
    const comments = read(LS.comments, []);
    const c = comments.find(x => x.id === cid);
    if (c) { c.likes = likes.filter(l => l.comment_id === cid).length; write(LS.comments, comments); }
    return ok({ ok: true, likes: c ? c.likes : 0 });
  }

  if (path === '/api/comments/delete' && method === 'POST') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    const cid = Number(body.id);
    if (!cid) return err('参数错误');
    write(LS.comments, read(LS.comments, []).filter(c => c.id !== cid));
    write(LS.likes, read(LS.likes, []).filter(l => l.comment_id !== cid));
    return ok({ ok: true });
  }

  if (path === '/api/comments/clear' && method === 'POST') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    write(LS.comments, []);
    write(LS.likes, []);
    return ok({ ok: true });
  }

  if (path === '/api/feedback' && method === 'POST') {
    if (!user) return err('请先登录', 401);
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return err('反馈内容不能为空');
    const fb = read(LS.feedback, []);
    fb.push({ id: nextId(fb), user_id: user.id, name: user.username, text, reply: null, replied_at: null, created_at: Date.now() });
    write(LS.feedback, fb);
    return ok({ ok: true });
  }

  if (path === '/api/feedback' && method === 'GET') {
    if (!user) return err('请先登录', 401);
    const fb = read(LS.feedback, []);
    const rows = user.role === 'admin' ? fb : fb.filter(x => x.user_id === user.id);
    const list = rows
      .slice()
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 500)
      .map(x => ({ id: x.id, name: x.name, text: x.text, reply: x.reply, replied_at: x.replied_at, created_at: x.created_at }));
    return ok({ feedback: list });
  }

  if (path === '/api/feedback/reply' && method === 'POST') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    const fid = Number(body.id);
    const reply = String(body.reply || '').trim().slice(0, 500);
    if (!fid || !reply) return err('参数错误');
    const fb = read(LS.feedback, []);
    const x = fb.find(y => y.id === fid);
    if (x) { x.reply = reply; x.replied_at = Date.now(); write(LS.feedback, fb); }
    return ok({ ok: true });
  }

  if (path === '/api/change-password' && method === 'POST') {
    if (!user) return err('请先登录', 401);
    const oldP = String(body.oldPassword || '');
    const newP = String(body.newPassword || '');
    if (newP.length < 4) return err('新密码至少 4 位');
    if (newP === oldP) return err('新密码不能与当前密码相同');
    const users = read(LS.users, []);
    const u = users.find(x => x.id === user.id);
    if (!u) return err('用户不存在', 404);
    const oldHash = await hashPassword(oldP, u.salt);
    if (oldHash !== u.pass_hash) return err('当前密码不正确');
    const salt = randomSalt();
    const hash = await hashPassword(newP, salt);
    u.pass_hash = hash; u.salt = salt;
    write(LS.users, users);
    return ok({ ok: true });
  }

  if (path === '/api/users' && method === 'GET') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    const users = read(LS.users, []).map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
    return ok({ users });
  }

  if (path === '/api/users/delete' && method === 'POST') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    const uid = Number(body.id);
    if (!uid) return err('参数错误');
    if (uid === user.id) return err('不能删除当前登录的管理员账号');
    write(LS.users, read(LS.users, []).filter(u => u.id !== uid));
    write(LS.comments, read(LS.comments, []).filter(c => c.user_id !== uid));
    write(LS.likes, read(LS.likes, []).filter(l => l.user_id !== uid));
    write(LS.feedback, read(LS.feedback, []).filter(f => f.user_id !== uid));
    return ok({ ok: true });
  }

  if (path === '/api/users/reset' && method === 'POST') {
    if (!user || user.role !== 'admin') return err('无权限', 403);
    const uid = Number(body.id);
    if (!uid) return err('参数错误');
    const users = read(LS.users, []);
    const u = users.find(x => x.id === uid);
    if (u) { const salt = randomSalt(); u.pass_hash = await hashPassword('1234', salt); u.salt = salt; write(LS.users, users); }
    return ok({ ok: true });
  }

  return err('Not Found', 404);
}
