const UserModel = require('./models/user');
const ProfileModel = require('./models/profile');
const SettingModel = require('./models/setting');
const ContactModel = require('./models/contact');
const InboxModel = require('./models/inbox');
const ChatModel = require('./models/chat');
const GroupModel = require('./models/group');
const encrypt = require('../helpers/encrypt');
const config = require('../config');

const DEMO_PASSWORD = 'demo1234';

const users = [
  {
    username: 'alex',
    email: 'alex@wpmessager.dev',
    fullname: 'Alex Morgan',
    bio: 'Product designer. Coffee first, pixels second.',
    phone: '+1 555 0101',
    avatar: '/assets/images/avatar-alex.svg',
  },
  {
    username: 'maya',
    email: 'maya@wpmessager.dev',
    fullname: 'Maya Chen',
    bio: 'Frontend engineer building calm interfaces.',
    phone: '+1 555 0102',
    avatar: '/assets/images/avatar-maya.svg',
  },
  {
    username: 'sam',
    email: 'sam@wpmessager.dev',
    fullname: 'Sam Rivera',
    bio: 'Project lead. Turning ideas into shipped products.',
    phone: '+1 555 0103',
    avatar: '/assets/images/avatar-sam.svg',
  },
];

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

const upsertUser = async (data) => {
  const existing = await UserModel.findOne({ username: data.username });

  if (existing) return existing;

  const user = await new UserModel({
    username: data.username,
    email: data.email,
    password: encrypt(DEMO_PASSWORD),
    verified: true,
    qrCode: `WP-${data.username.toUpperCase()}-DEMO`,
  }).save();

  await new SettingModel({
    userId: user._id,
    dark: false,
    enterToSend: true,
    mute: false,
    sortContactByName: false,
    keepArchived: false,
  }).save();

  await new ProfileModel({
    userId: user._id,
    username: data.username,
    email: data.email,
    fullname: data.fullname,
    bio: data.bio,
    phone: data.phone,
    avatar: data.avatar,
    online: false,
  }).save();

  return user;
};

module.exports = async () => {
  if (!config.seedDemo) return;

  try {
    const { countDocuments } = UserModel;
    const existingDemo = await UserModel.countDocuments({
      username: { $in: users.map((user) => user.username) },
    });

    if (existingDemo === users.length) return;

    console.log('seeding demo workspace...');

    const created = {};

    // sequential to keep creation deterministic
    // eslint-disable-next-line no-restricted-syntax
    for (const data of users) {
      // eslint-disable-next-line no-await-in-loop
      created[data.username] = await upsertUser(data);
    }

    const alex = created.alex;
    const maya = created.maya;
    const sam = created.sam;

    const makeContact = async (owner, friend, roomId) => {
      const exists = await ContactModel.findOne({
        userId: owner._id,
        friendId: friend._id,
      });

      if (!exists) {
        await new ContactModel({
          userId: owner._id,
          friendId: friend._id,
          roomId,
        }).save();
      }
    };

    await makeContact(alex, maya, 'demo-room-alex-maya');
    await makeContact(maya, alex, 'demo-room-alex-maya');
    await makeContact(alex, sam, 'demo-room-alex-sam');
    await makeContact(sam, alex, 'demo-room-alex-sam');
    await makeContact(maya, sam, 'demo-room-maya-sam');
    await makeContact(sam, maya, 'demo-room-maya-sam');

    const addMessages = async (messages) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const message of messages) {
        // eslint-disable-next-line no-await-in-loop
        await new ChatModel({
          userId: message.userId,
          roomId: message.roomId,
          text: message.text,
          readed: true,
          deletedBy: [],
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
        }).save();
      }
    };

    // import mongoose to obtain ids as strings
    const id = (user) => String(user._id);

    const alexMayaMessages = [
      {
        userId: id(maya),
        text: 'Hey Alex! I pushed the new dashboard screens. Can you take a look?',
        createdAt: minutesAgo(130),
      },
      {
        userId: id(alex),
        text: 'Just opened them — the spacing feels so much better. 🔥',
        createdAt: minutesAgo(126),
      },
      {
        userId: id(maya),
        text: 'Amazing. I also cleaned up the empty states.',
        createdAt: minutesAgo(124),
      },
      {
        userId: id(alex),
        text: 'Perfect. Let’s review it together after standup.',
        createdAt: minutesAgo(3),
      },
    ];

    await addMessages(
      alexMayaMessages.map((message) => ({
        ...message,
        roomId: 'demo-room-alex-maya',
      }))
    );

    const alexSamMessages = [
      {
        userId: id(sam),
        text: 'The client loved the prototype. Nice work team! 🎉',
        createdAt: minutesAgo(240),
      },
      {
        userId: id(alex),
        text: 'That’s great news. I’ll polish the final details today.',
        createdAt: minutesAgo(55),
      },
    ];

    await addMessages(
      alexSamMessages.map((message) => ({
        ...message,
        roomId: 'demo-room-alex-sam',
      }))
    );

    const mayaSamMessages = [
      {
        userId: id(sam),
        text: 'Maya, can you send me the latest component library link?',
        createdAt: minutesAgo(180),
      },
      {
        userId: id(maya),
        text: 'Sent it over — check the new tokens folder too.',
        createdAt: minutesAgo(35),
      },
    ];

    await addMessages(
      mayaSamMessages.map((message) => ({
        ...message,
        roomId: 'demo-room-maya-sam',
      }))
    );

    // group chat
    const groupRoom = 'demo-group-design-crew';
    let group = await GroupModel.findOne({ roomId: groupRoom });

    if (!group) {
      group = await new GroupModel({
        roomId: groupRoom,
        adminId: id(alex),
        participantsId: [id(alex), id(maya), id(sam)],
        name: 'Design Crew',
        desc: 'Weekly design reviews, ideas, and tiny wins.',
        link: '/group/+wpdesigncrew',
      }).save();
    }

    const groupMessages = [
      {
        userId: id(sam),
        text: 'Welcome to the Design Crew space 👋',
        createdAt: minutesAgo(310),
      },
      {
        userId: id(maya),
        text: 'Dropping the new moodboard here later today.',
        createdAt: minutesAgo(300),
      },
      {
        userId: id(alex),
        text: 'Great — let’s keep the feedback in this thread.',
        createdAt: minutesAgo(18),
      },
    ];

    const existingGroupMessages = await ChatModel.countDocuments({
      roomId: groupRoom,
    });

    if (existingGroupMessages === 0) {
      await addMessages(
        groupMessages.map((message) => ({ ...message, roomId: groupRoom }))
      );
    }

    const now = new Date();

    const inboxExists = await InboxModel.findOne({
      roomId: 'demo-room-alex-maya',
    });

    if (!inboxExists) {
      await new InboxModel({
        ownersId: [id(alex), id(maya)],
        roomId: 'demo-room-alex-maya',
        roomType: 'private',
        unreadMessage: 1,
        fileId: null,
        deletedBy: [],
        content: {
          from: id(alex),
          senderName: 'Alex Morgan',
          text: 'Perfect. Let’s review it together after standup.',
          time: minutesAgo(3),
        },
      }).save();
    }

    const inbox2 = await InboxModel.findOne({
      roomId: 'demo-room-alex-sam',
    });

    if (!inbox2) {
      await new InboxModel({
        ownersId: [id(alex), id(sam)],
        roomId: 'demo-room-alex-sam',
        roomType: 'private',
        unreadMessage: 1,
        fileId: null,
        deletedBy: [],
        content: {
          from: id(sam),
          senderName: 'Sam Rivera',
          text: 'The client loved the prototype. Nice work team! 🎉',
          time: minutesAgo(240),
        },
      }).save();
    }

    const inbox3 = await InboxModel.findOne({
      roomId: 'demo-room-maya-sam',
    });

    if (!inbox3) {
      await new InboxModel({
        ownersId: [id(maya), id(sam)],
        roomId: 'demo-room-maya-sam',
        roomType: 'private',
        unreadMessage: 1,
        fileId: null,
        deletedBy: [],
        content: {
          from: id(sam),
          senderName: 'Sam Rivera',
          text: 'Maya, can you send me the latest component library link?',
          time: minutesAgo(180),
        },
      }).save();
    }

    const inbox4 = await InboxModel.findOne({ roomId: groupRoom });

    if (!inbox4) {
      await new InboxModel({
        ownersId: [id(alex), id(maya), id(sam)],
        roomId: groupRoom,
        roomType: 'group',
        unreadMessage: 0,
        fileId: null,
        deletedBy: [],
        content: {
          from: id(alex),
          senderName: 'Alex Morgan',
          text: 'Great — let’s keep the feedback in this thread.',
          time: minutesAgo(18),
        },
      }).save();
    }

    // levels marks the seed as complete
    await UserModel.updateOne(
      { _id: alex._id },
      { $set: { seededAt: now } }
    );

    console.log('demo workspace ready (password: demo1234)');
  } catch (error0) {
    console.error(`demo seed skipped: ${error0.message}`);
  }
};

module.exports.DEMO_PASSWORD = DEMO_PASSWORD;
