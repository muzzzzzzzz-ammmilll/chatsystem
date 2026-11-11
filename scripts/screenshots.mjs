/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CDP = 'http://127.0.0.1:9229';
const OUT = path.join(__dirname, '..', 'docs', 'img');
const APP = 'http://localhost:3000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const targets = await (await fetch(`${CDP}/json`)).json();
  const target = targets.find((item) => item.type === 'page');

  if (!target) throw new Error('No Chrome page target found');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  let sequence = 0;
  const pending = new Map();

  socket.on('message', (raw) => {
    const message = JSON.parse(raw);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text
      );
    }

    return result.result?.value;
  };

  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(
      `saved ${name} (${(Buffer.from(data, 'base64').length / 1024).toFixed(0)} KB)`
    );
  };

  const viewport = (width, height, mobile = false) =>
    send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await viewport(1440, 900);
  await send('Page.navigate', { url: APP });
  await sleep(4500);
  await shot('login.png');

  const login = await evaluate(`(async () => {
    const response = await fetch('http://localhost:8080/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alex', password: 'demo1234' }),
    });
    const data = await response.json();
    localStorage.setItem('token', data.payload);
    localStorage.setItem('cache', JSON.stringify({ me: 'alex' }));
    return { ok: response.ok, message: data.message };
  })()`);
  console.log('browser login:', login);

  await send('Page.reload', { ignoreCache: true });
  await sleep(4500);
  await shot('light-desktop.png');

  const opened = await evaluate(`(() => {
    const item = [...document.querySelectorAll('#inbox > div')]
      .find((node) => node.textContent.includes('Maya Chen'));
    if (!item) return false;
    item.click();
    return true;
  })()`);
  if (!opened) throw new Error('Could not open Maya conversation');
  await sleep(2500);
  await shot('chat-light.png');

  const openSettings = await evaluate(`(async () => {
    document.querySelector('button[aria-label="Menu"]').click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const button = [...document.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'Settings');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!openSettings) throw new Error('Could not open settings');
  await sleep(1200);
  await shot('settings-light.png');

  await evaluate(
    `document.querySelector('button[aria-label="Dark mode"]').click()`
  );
  await sleep(1600);
  await shot('settings-dark.png');

  await evaluate(
    `document.querySelector('#setting button[aria-label="Back"]').click()`
  );
  await sleep(600);
  await shot('dark-desktop.png');

  const openProfile = await evaluate(`(async () => {
    document.querySelector('button[aria-label="Menu"]').click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const button = [...document.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'My profile');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!openProfile) throw new Error('Could not open profile');
  await sleep(1400);
  await shot('profile-dark.png');

  // restore light mode and take a mobile view of the conversation
  const restored = await evaluate(`(async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8080/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ dark: false }),
    });
    localStorage.setItem('wp-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    return response.status;
  })()`);
  console.log('restored light mode:', restored);

  await viewport(390, 844, true);
  await send('Page.reload', { ignoreCache: true });
  await sleep(3500);
  await evaluate(`(() => {
    const item = [...document.querySelectorAll('#inbox > div')]
      .find((node) => node.textContent.includes('Maya Chen'));
    if (item) item.click();
    return Boolean(item);
  })()`);
  await sleep(2200);
  await shot('mobile-chat.png');

  await viewport(1440, 900);
  socket.close();
  console.log('done');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
