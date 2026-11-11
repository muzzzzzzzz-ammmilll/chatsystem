const isDev = process.env.NODE_ENV === 'development';

export default {
  isDev,
  brandName: 'MZ chat',
  avatarUploadLimit: 2 * 1024 * 1024, // 2 MB
};
