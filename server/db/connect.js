const { connect } = require('mongoose');
const { isDev, db } = require('../config');

let mongoServer; // keeps the in-memory instance alive

module.exports = async () => {
  try {
    let uri = db.uri;

    if (!uri || uri.trim() === '') {
      // No external URI — spin up an in-memory MongoDB via mongodb-memory-server.
      // eslint-disable-next-line global-require
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName: db.name },
      });
      uri = mongoServer.getUri();
      console.log(`embedded MongoDB started → ${uri}`);
    }

    await connect(uri, { dbName: db.name });
    console.log('database connected');

    // Run seed after successful connection
    // eslint-disable-next-line global-require
    const seed = require('./seed');
    await seed();
  } catch (error0) {
    console.log(error0.message);
  }
};
