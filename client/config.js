const isDev = process.env.NODE_ENV === 'development';
const apiUrl = process.env.API_URL || (isDev ? 'http://localhost:8080' : '');

export default {
  isDev,
  apiUrl,
  brandName: 'MZ chat',
  avatarUploadLimit: 2 * 1024 * 1024, // 2 MB
};
