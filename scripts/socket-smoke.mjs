import { io } from 'socket.io-client';

const API = 'http://127.0.0.1:8080/api';
const WS = 'http://127.0.0.1:8080';
const stamp = Date.now().toString().slice(-6);
const password = 'sockettest123';
const results = [];
const createdUsers = [];
const openSockets = [];
let activeGroupId = null;

const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
};

const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = (socket, event, predicate = () => true, timeout = 4000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);
    function handler(payload) {
      let matches = false;
      try {
        matches = predicate(payload);
      } catch {
        matches = false;
      }
      if (!matches) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });

const createUser = async (name) => {
  const username = `${name}${stamp}`;
  const reg = await api('/users/register', {
    method: 'POST',
    body: {
      username,
      email: `${username}@example.com`,
      password,
      fullname: `${name[0].toUpperCase()}${name.slice(1)} Socket`,
    },
  });
  if (reg.status !== 201) throw new Error(`register ${name}: ${reg.json?.message}`);

  const verify = await api('/users/verify', {
    method: 'POST',
    token: reg.json.payload,
    body: { otp: reg.json.otp },
  });
  if (verify.status !== 200) throw new Error(`verify ${name}: ${verify.json?.message}`);

  const me = await api('/users', { token: reg.json.payload });
  const profile = await api(`/profiles/${me.json.payload._id}`, {
    token: reg.json.payload,
  });
  const user = {
    username,
    token: reg.json.payload,
    id: me.json.payload._id,
    fullname: profile.json.payload.fullname,
  };
  createdUsers.push(user);
  return user;
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(WS, {
      transports: ['websocket'],
      auth: { token },
      forceNew: true,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('socket connect timeout'));
    }, 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      openSockets.push(socket);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

const makeContact = async (owner, friend) => {
  const r = await api('/contacts', {
    method: 'POST',
    token: owner.token,
    body: { username: friend.username },
  });
  if (r.status !== 201) throw new Error(`contact: ${r.json?.message}`);
  return r.json.payload.roomId;
};

const main = async () => {
  const alice = await createUser('alice');
  const bob = await createUser('bob');
  const cara = await createUser('cara');
  check('created three throwaway users', Boolean(alice.id && bob.id && cara.id));

  // DM room created by alice, then reused when bob adds alice back
  const dmRoom = await makeContact(alice, bob);
  const dmRoomReverse = await makeContact(bob, alice);
  check('contact rooms are reused both ways', dmRoom === dmRoomReverse, dmRoom);
  await makeContact(alice, cara);
  await makeContact(bob, cara);

  const s1 = await connect(alice.token);
  const s2 = await connect(bob.token);
  const s3 = await connect(cara.token);
  check('three sockets connected', s1.connected && s2.connected && s3.connected);

  s1.emit('user/connect', alice.id);
  s2.emit('user/connect', bob.id);
  s3.emit('user/connect', cara.id);
  await sleep(250);
  const presence = await api(`/profiles/${alice.id}`, { token: bob.token });
  check('user/connect marks profile online', presence.json?.payload?.online === true, String(presence.json?.payload?.online));

  s1.emit('room/open', { newRoom: dmRoom });
  s2.emit('room/open', { newRoom: dmRoom });
  await sleep(150);

  // --- DM message ---
  const incoming = waitFor(s2, 'chat/insert', (p) => p.roomId === dmRoom && p.text === 'hello from the smoke test');
  s1.emit('chat/insert', {
    roomId: dmRoom,
    userId: alice.id,
    ownersId: [alice.id, bob.id],
    roomType: 'private',
    text: 'hello from the smoke test',
  });
  const message = await incoming;
  check('DM chat/insert delivered to peer', Boolean(message._id), message._id);
  check('message includes sender profile', message.profile?.fullname === alice.fullname, message.profile?.fullname);

  const inboxEvent = await waitFor(
    s2,
    'inbox/find',
    (p) => p.roomId === dmRoom && p.content?.text === 'hello from the smoke test'
  );
  check('inbox/find updates with message preview', inboxEvent.unreadMessage === 1, `unread=${inboxEvent.unreadMessage}`);

  let chats = await api(`/chats/${dmRoom}`, { token: bob.token });
  check('message persisted via GET /chats', chats.json?.payload?.some((c) => c._id === message._id));

  // --- typing ---
  const typing = waitFor(s2, 'chat/typing', (p) => p === 'typing...');
  s1.emit('chat/typing', { roomId: dmRoom, roomType: 'private', userId: alice.id });
  check('typing indicator delivered', (await typing) === 'typing...');
  const typingEnds = await waitFor(s2, 'chat/typing-ends', () => true, 3000);
  check('typing indicator auto-clears', typingEnds === true);

  // --- read receipts ---
  const readEvent = waitFor(s1, 'chat/read', (p) => p === true);
  const readInboxEvent = waitFor(
    s1,
    'inbox/find',
    (p) => p.roomId === dmRoom && p.unreadMessage === 0
  );
  s2.emit('chat/read', { roomId: dmRoom, userId: bob.id });
  check('chat/read broadcast to sender', (await readEvent) === true);
  const readInbox = await readInboxEvent;
  check('read resets unread count', readInbox.unreadMessage === 0);

  // --- delete for me ---
  const deleteMine = waitFor(s1, 'chat/delete', (p) => p.chatsId?.includes(message._id));
  s1.emit('chat/delete', {
    userId: alice.id,
    chatsId: [message._id],
    roomId: dmRoom,
    deleteForEveryone: false,
  });
  check('delete-for-me acknowledged', Boolean((await deleteMine).chatsId?.length));
  chats = await api(`/chats/${dmRoom}`, { token: bob.token });
  check('delete-for-me keeps message for peer', chats.json?.payload?.some((c) => c._id === message._id));

  // --- delete for everyone ---
  const deleteAllSelf = waitFor(s1, 'chat/delete', (p) => p.chatsId?.includes(message._id));
  const deleteAllPeer = waitFor(s2, 'chat/delete', (p) => p.chatsId?.includes(message._id));
  s1.emit('chat/delete', {
    userId: alice.id,
    chatsId: [message._id],
    roomId: dmRoom,
    deleteForEveryone: true,
  });
  await Promise.all([deleteAllSelf, deleteAllPeer]);
  chats = await api(`/chats/${dmRoom}`, { token: bob.token });
  check('delete-for-everyone removes message', !chats.json?.payload?.some((c) => c._id === message._id));

  // --- group lifecycle ---
  const groupCreated = new Promise((resolve) => {
    s1.emit(
      'group/create',
      {
        adminId: alice.id,
        participantsId: [alice.id, bob.id],
        name: `Socket Crew ${stamp}`,
        desc: 'Created by the socket smoke test',
      },
      resolve
    );
  });
  const groupCreateEvent = waitFor(
    s2,
    'group/create',
    (p) => p?.roomId?.startsWith('group-')
  );
  const createResult = await groupCreated;
  check('group/create succeeds with callback', createResult.success === true, createResult.message);
  const groupEvent = await groupCreateEvent;
  const groupRoom = groupEvent.roomId;
  const groupId = String(createResult.payload._id);
  activeGroupId = groupId;
  check('group/create delivered to member inbox', groupEvent.roomType === 'group', groupRoom);

  const editEvent = waitFor(s2, 'group/edit', (p) =>
    p.name?.startsWith('Socket Crew Renamed')
  );
  const editResult = await new Promise((resolve) => {
    s1.emit(
      'group/edit',
      { groupId, userId: alice.id, form: { name: `Socket Crew Renamed ${stamp}`, desc: 'Updated' } },
      resolve
    );
  });
  check('admin can edit group', editResult.success === true && editResult.payload?.name.startsWith('Socket Crew Renamed'), editResult.message);
  check('group edit broadcast to member', Boolean(await editEvent));

  const deniedEdit = await new Promise((resolve) => {
    s2.emit(
      'group/edit',
      { groupId, userId: bob.id, form: { name: 'Unauthorized', desc: '' } },
      resolve
    );
  });
  check('non-admin cannot edit group', deniedEdit.success === false, deniedEdit.message);

  // add cara
  const addEvent = waitFor(s3, 'group/add-participants', (p) => p.groupId === groupId);
  s1.emit('group/add-participants', { groupId, userId: alice.id, friendsId: [cara.id] });
  const added = await addEvent;
  check('group/add-participants notifies new member', added.participantsId.includes(cara.id));
  const participants = await api(`/groups/${groupId}/participants`, { token: cara.token });
  check(
    'group participants updated in database',
    Array.isArray(participants.json?.payload) && participants.json.payload.length === 3,
    `count=${participants.json?.payload?.length}`
  );

  // group chat message + read
  s2.emit('room/open', { newRoom: groupRoom });
  s3.emit('room/open', { newRoom: groupRoom });
  await sleep(100);
  const groupMessageEvent = waitFor(
    s3,
    'chat/insert',
    (p) => p.roomId === groupRoom && p.text === 'group hello'
  );
  s1.emit('chat/insert', {
    roomId: groupRoom,
    userId: alice.id,
    ownersId: [alice.id, bob.id, cara.id],
    roomType: 'group',
    text: 'group hello',
  });
  const groupMessage = await groupMessageEvent;
  check('group message delivered to member', Boolean(groupMessage._id));

  const groupRead = waitFor(s2, 'chat/read', (p) => p === true);
  s3.emit('chat/read', { roomId: groupRoom, userId: cara.id });
  check('group read receipt broadcast', (await groupRead) === true);

  // transfer admin to cara
  const adminEvent = waitFor(s3, 'group/add-admin', (p) => p.adminId === cara.id);
  s1.emit('group/add-admin', { groupId, userId: alice.id, participantId: cara.id });
  await adminEvent;
  const groupAfterAdmin = await api(`/groups/${groupId}`, { token: cara.token });
  check('group admin transferred', String(groupAfterAdmin.json?.payload?.adminId) === String(cara.id), String(groupAfterAdmin.json?.payload?.adminId));

  const newAdminEdit = await new Promise((resolve) => {
    s3.emit(
      'group/edit',
      { groupId, userId: cara.id, form: { name: `Cara Admin Crew ${stamp}`, desc: 'Now managed by Cara' } },
      resolve
    );
  });
  check('new admin can edit group', newAdminEdit.success === true, newAdminEdit.message);

  // remove bob
  const removedEvent = waitFor(s2, 'group/remove-participant', (p) => p.participantId === bob.id);
  const removedInbox = waitFor(s2, 'inbox/delete', (p) => Array.isArray(p) && p.includes(groupRoom));
  s3.emit('group/remove-participant', { groupId, userId: cara.id, participantId: bob.id });
  await Promise.all([removedEvent, removedInbox]);
  const afterRemove = await api(`/groups/${groupId}/participants`, { token: cara.token });
  check(
    'removed participant leaves group',
    Array.isArray(afterRemove.json?.payload) && afterRemove.json.payload.length === 2,
    `count=${afterRemove.json?.payload?.length}`
  );

  // alice exits; cara remains as admin
  const exitEvent = waitFor(s3, 'group/exit', (p) => p.userId === alice.id);
  const exitResult = await new Promise((resolve) => {
    s1.emit('group/exit', { userId: alice.id, groupId }, resolve);
  });
  await exitEvent;
  check('group/exit succeeds with callback', exitResult.success === true, exitResult.message);
  const afterExit = await api(`/groups/${groupId}`, { token: cara.token });
  check(
    'exiting member removed from group',
    !afterExit.json?.payload?.participantsId?.map(String).includes(alice.id)
  );

  // last member exits; group should be deleted
  const lastExit = await new Promise((resolve) => {
    s3.emit('group/exit', { userId: cara.id, groupId }, resolve);
  });
  await sleep(200);
  const gone = await api(`/groups/${groupId}`, { token: cara.token });
  check('last exit deletes group', lastExit.success === true && gone.status === 404, `status=${gone.status}`);
  activeGroupId = null;

  // --- cleanup ---
  await cleanup();
  check('throwaway users cleaned up', true);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:', failed.map((r) => r.name).join(' | '));
    process.exit(1);
  }
};

async function cleanup() {
  // If the test failed mid-way, remove any group it created before the
  // throwaway members are deleted.
  if (activeGroupId && openSockets[0]?.connected) {
    for (const user of createdUsers) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1500);
        openSockets[0].emit(
          'group/exit',
          { userId: user.id, groupId: activeGroupId },
          () => {
            clearTimeout(timer);
            resolve();
          }
        );
      });
    }
    activeGroupId = null;
  }

  // Remove test inboxes/chat history while the users still have tokens.
  for (const user of createdUsers) {
    const inboxes = await api('/inboxes', { token: user.token });
    for (const inbox of inboxes.json?.payload || []) {
      await api(`/chats/${inbox.roomId}`, {
        method: 'DELETE',
        token: user.token,
      });
    }
  }

  openSockets.splice(0).forEach((socket) => socket.disconnect());
  await sleep(150);

  for (const user of createdUsers.splice(0)) {
    // remove contacts before deleting accounts
    const contacts = await api('/contacts', { token: user.token });
    for (const contact of contacts.json?.payload || []) {
      await api(`/contacts/${contact.friendId}`, {
        method: 'DELETE',
        token: user.token,
      });
    }
    const del = await api('/users', {
      method: 'DELETE',
      token: user.token,
      body: { password },
    });
    if (del.status !== 200) {
      console.log(`cleanup failed for ${user.username}: ${del.json?.message}`);
    }
  }
}

main().catch(async (error) => {
  console.error('SMOKE TEST ERROR:', error);
  await cleanup().catch(() => {});
  process.exit(1);
});
