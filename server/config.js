const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  isDev,
  cors: {
    origin: process.env.CLIENT_URL
      ? [process.env.CLIENT_URL, 'http://localhost:3000']
      : true,
    credentials: true,
  },
  db: {
    uri: process.env.MONGO_URI,
    name: process.env.MONGO_DB_NAME || 'wp_messager',
  },
  seedDemo: process.env.SEED_DEMO === 'true',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
