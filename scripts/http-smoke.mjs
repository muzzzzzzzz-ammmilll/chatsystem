const BASE = 'http://127.0.0.1:8080/api';
const stamp = Date.now().toString().slice(-7);
const username = `smoke${stamp}`;
const newUsername = `smokey${stamp}`;
const email = `${username}@example.com`;
const password = 'testpass123';
const newPassword = 'testpass456';
let token = '';
let userId = '';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
};

const api = async (path, { method = 'GET', body, auth = true } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
};

// 0. health
{
  const res = await fetch('http://127.0.0.1:8080/api/health');
  const json = await res.json();
  check('health endpoint', res.status === 200 && json.status === 'ok', json.app);
}

// 1. register
{
  const r = await api('/users/register', {
    method: 'POST',
    auth: false,
    body: { username, email, password, fullname: 'Smoke Tester' },
  });
  token = r.json?.payload || '';
  check(
    'register returns 201 + token + dev OTP',
    r.status === 201 && Boolean(token) && /^\d{4}$/.test(String(r.json?.otp || '')),
    `status=${r.status} otp=${r.json?.otp}`
  );
}

// 2. duplicate register
{
  const r = await api('/users/register', {
    method: 'POST',
    auth: false,
    body: { username, email, password },
  });
  check('duplicate registration rejected', r.status === 409, r.json?.message);
}

// 3. bad OTP
{
  const r = await api('/users/verify', {
    method: 'POST',
    body: { otp: 1111 },
  });
  check('wrong OTP rejected', r.status === 401, r.json?.message);
}

// 4. resend OTP
let otp;
{
  const r = await api('/users/resend-otp', { method: 'POST' });
  otp = r.json?.otp;
  check(
    'resend OTP returns dev code',
    r.status === 200 && /^\d{4}$/.test(String(otp || '')),
    `otp=${otp}`
  );
}

// 5. verify
{
  const r = await api('/users/verify', { method: 'POST', body: { otp } });
  check('verify email with OTP', r.status === 200 && r.json?.payload?.verified === true, r.json?.message);
}

// 6. login
{
  const r = await api('/users/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
  token = r.json?.payload || token;
  check('login with new account', r.status === 200 && Boolean(token), r.json?.message);
}

// 7. session user
{
  const r = await api('/users');
  userId = r.json?.payload?._id;
  check(
    'GET /users returns session user without secrets',
    r.status === 200 &&
      Boolean(userId) &&
      !('password' in (r.json?.payload || {})) &&
      !('otp' in (r.json?.payload || {})),
    userId
  );
}

// 8. settings defaults
{
  const r = await api('/settings');
  check(
    'GET /settings defaults',
    r.status === 200 &&
      typeof r.json?.payload?.dark === 'boolean' &&
      typeof r.json?.payload?.enterToSend === 'boolean',
    JSON.stringify(r.json?.payload)
  );
}

// 9. settings update
{
  const r = await api('/settings', { method: 'PUT', body: { dark: true, lang: 'en' } });
  check('PUT /settings persists toggles', r.status === 200 && r.json?.payload?.dark === true, r.json?.message);
  // restore
  await api('/settings', { method: 'PUT', body: { dark: false } });
}

// 10. profile read
{
  const r = await api(`/profiles/${userId}`);
  check('GET own profile', r.status === 200 && r.json?.payload?.username === username, r.json?.payload?.username);
}

// 11. profile update (display name + username)
{
  const r = await api('/profiles', {
    method: 'PUT',
    body: { fullname: 'Smoke Tester Updated', username: newUsername, bio: 'Prototype test account' },
  });
  check(
    'PUT profile updates details',
    r.status === 200 && r.json?.payload?.username === newUsername,
    r.json?.payload?.username
  );
  // token still valid; /users should reflect new username
  const me = await api('/users');
  check('username change syncs user account', me.json?.payload?.username === newUsername, me.json?.payload?.username);
}

// 12. profile validation
{
  const r = await api('/profiles', { method: 'PUT', body: { fullname: 'x' } });
  check('profile validation rejects short name', r.status === 400, r.json?.message);
}

// 13. contacts list for demo user alex (separate login)
let alexToken = '';
{
  const r = await api('/users/login', {
    method: 'POST',
    auth: false,
    body: { username: 'alex', password: 'demo1234' },
  });
  alexToken = r.json?.payload;
  check('demo login alex/demo1234', r.status === 200 && Boolean(alexToken), r.json?.message);
}

let alexId;
{
  const prev = token;
  token = alexToken;
  const users = await api('/users');
  alexId = users.json?.payload?._id;
  const contacts = await api('/contacts');
  check(
    'alex has seeded contacts',
    contacts.status === 200 && Array.isArray(contacts.json?.payload) && contacts.json.payload.length >= 2,
    `count=${contacts.json?.payload?.length}`
  );
  const inboxes = await api('/inboxes');
  check(
    'alex has seeded inboxes',
    inboxes.status === 200 && Array.isArray(inboxes.json?.payload) && inboxes.json.payload.length >= 2,
    `count=${inboxes.json?.payload?.length}`
  );
  token = prev;
}

// 14. add contact (new user adds alex)
let contactRoomId;
{
  const r = await api('/contacts', { method: 'POST', body: { username: 'alex', fullname: 'Alex' } });
  contactRoomId = r.json?.payload?.roomId;
  check('POST /contacts adds alex', r.status === 201 && Boolean(contactRoomId), contactRoomId);
}

// 15. profile privacy for non-contact
{
  const prev = token;
  token = alexToken;
  const r = await api(`/profiles/${userId}`);
  check(
    'non-contact profile hides email/phone',
    r.status === 200 && r.json?.payload?.email === '' && r.json?.payload?.saved === false,
    `saved=${r.json?.payload?.saved}`
  );
  token = prev;
}

// 16. avatar upload (data URL)
{
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lD1cAAAAAElFTkSuQmCC';
  const r = await api('/avatars', { method: 'POST', body: { avatar: png } });
  check(
    'POST /avatars stores local upload',
    r.status === 200 && String(r.json?.payload || '').length > 0,
    String(r.json?.payload || '').slice(0, 60)
  );
}

// 17. forgot password
let resetOtp;
{
  const r = await api('/users/forgot-password', {
    method: 'POST',
    auth: false,
    body: { username: newUsername },
  });
  resetOtp = r.json?.otp;
  check('forgot-password returns dev OTP', r.status === 200 && /^\d{4}$/.test(String(resetOtp || '')), `otp=${resetOtp}`);
  const unknown = await api('/users/forgot-password', {
    method: 'POST',
    auth: false,
    body: { username: 'nobody_here_98765' },
  });
  check('forgot-password does not enumerate accounts', unknown.status === 200 && unknown.json?.otp === null, unknown.json?.message);
}

// 18. reset password
{
  const bad = await api('/users/reset-password', {
    method: 'POST',
    auth: false,
    body: { username: newUsername, otp: 1111, password: newPassword },
  });
  check('reset rejects wrong OTP', bad.status === 401, bad.json?.message);
  const r = await api('/users/reset-password', {
    method: 'POST',
    auth: false,
    body: { username: newUsername, otp: resetOtp, password: newPassword },
  });
  check('reset password with OTP', r.status === 200 && Boolean(r.json?.payload), r.json?.message);
  const login = await api('/users/login', {
    method: 'POST',
    auth: false,
    body: { username: newUsername, password: newPassword },
  });
  token = login.json?.payload || token;
  check('login with reset password', login.status === 200, login.json?.message);
}

// 19. change password
{
  const wrongOld = await api('/users/change-pass', {
    method: 'PATCH',
    body: { oldPass: 'incorrect', newPass: password, confirmNewPass: password },
  });
  check('change-pass rejects wrong old password', wrongOld.status === 401, wrongOld.json?.message);
  const mismatch = await api('/users/change-pass', {
    method: 'PATCH',
    body: { oldPass: newPassword, newPass: 'abcdef1', confirmNewPass: 'abcdef2' },
  });
  check('change-pass rejects mismatched confirmation', mismatch.status === 400, mismatch.json?.message);
  const same = await api('/users/change-pass', {
    method: 'PATCH',
    body: { oldPass: newPassword, newPass: newPassword, confirmNewPass: newPassword },
  });
  check('change-pass rejects reuse of old password', same.status === 400, same.json?.message);
  const ok = await api('/users/change-pass', {
    method: 'PATCH',
    body: { oldPass: newPassword, newPass: password, confirmNewPass: password },
  });
  check('change-pass succeeds with valid new password', ok.status === 200, ok.json?.message);
  const login = await api('/users/login', {
    method: 'POST',
    auth: false,
    body: { username: newUsername, password },
  });
  token = login.json?.payload || token;
  check('login with changed password', login.status === 200, login.json?.message);
}

// 20. remove contact
{
  const r = await api(`/contacts/${alexId}`, { method: 'DELETE' });
  check('DELETE /contacts removes contact', r.status === 200, r.json?.message);
  const list = await api('/contacts');
  check(
    'contact removed from list',
    Array.isArray(list.json?.payload) && !list.json.payload.some((c) => String(c.friendId) === String(alexId)),
    `count=${list.json?.payload?.length}`
  );
}

// 21. unauthorized access
{
  const prev = token;
  token = '';
  const r = await api('/users');
  check('requests without token are rejected', r.status === 401, r.json?.message);
  token = 'not-a-real-token';
  const bad = await api('/settings');
  check('invalid token rejected', bad.status === 401, bad.json?.message);
  token = prev;
}

// 22. delete account
{
  const bad = await api('/users', { method: 'DELETE', body: { password: 'wrongpass' } });
  check('delete account rejects wrong password', bad.status === 401, bad.json?.message);
  const r = await api('/users', { method: 'DELETE', body: { password } });
  check('delete account succeeds', r.status === 200, r.json?.message);
  const me = await api('/users');
  check('deleted account cannot read session', me.status === 404, me.json?.message);
  const login = await api('/users/login', {
    method: 'POST',
    auth: false,
    body: { username: newUsername, password },
  });
  check('deleted account cannot log in', login.status === 401, login.json?.message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((r) => r.name).join(' | '));
  process.exit(1);
}
