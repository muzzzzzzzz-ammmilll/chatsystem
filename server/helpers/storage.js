const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const config = require('../config');
const uniqueId = require('./uniqueId');

const publicDir = path.resolve(__dirname, '..', '..', 'client', 'public');
const uploadsDir = path.join(publicDir, 'uploads');

const isCloudinaryConfigured = () =>
  Boolean(
    config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret
  );

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) return false;

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });

  return true;
};

const parseDataUrl = (dataUrl = '') => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);

  if (!match) return null;

  const mime = match[1] || 'application/octet-stream';
  const data = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(match[3]);

  return { mime, data };
};

const extensionFromMime = (mime) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  };

  return map[mime] || mime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
};

const extensionFromName = (name = '') => {
  const parts = name.split('.');
  if (parts.length < 2) return null;

  const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || null;
};

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

/**
 * Upload an avatar. Uses Cloudinary when configured, local disk otherwise.
 * @returns {Promise<string>} public URL
 */
exports.uploadAvatar = async ({ dataUrl, publicId }) => {
  if (configured()) {
    const upload = await cloudinary.uploader.upload(dataUrl, {
      folder: 'avatars',
      public_id: String(publicId),
      overwrite: true,
      resource_type: 'image',
    });

    return upload.secure_url || upload.url;
  }

  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    const errData = { statusCode: 400, message: 'Invalid image data' };
    throw errData;
  }

  const dir = path.join(uploadsDir, 'avatars');
  ensureDir(dir);

  // Remove previous avatar with a different extension.
  fs.readdirSync(dir)
    .filter((file) => file.startsWith(`${publicId}.`))
    .forEach((file) => {
      try {
        fs.unlinkSync(path.join(dir, file));
      } catch (error0) {
        // ignore
      }
    });

  const ext = extensionFromMime(parsed.mime);
  const filename = `${publicId}.${ext}`;

  fs.writeFileSync(path.join(dir, filename), parsed.data);

  return `/uploads/avatars/${filename}`;
};

/**
 * Store a chat attachment.
 * @returns {Promise<Object>} file metadata compatible with the File model
 */
exports.uploadChatFile = async ({ dataUrl, originalname = 'file' }) => {
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    const errData = { statusCode: 400, message: 'Invalid file data' };
    throw errData;
  }

  const nameExt = extensionFromName(originalname);
  const ext = nameExt || extensionFromMime(parsed.mime);
  const resourceType = parsed.mime.startsWith('image/')
    ? 'image'
    : parsed.mime.startsWith('video/')
      ? 'video'
      : 'raw';

  if (configured()) {
    const upload = await cloudinary.uploader.upload(dataUrl, {
      folder: 'chat',
      public_id: `${uniqueId(20)}.${ext}`,
      resource_type: 'auto',
    });

    return {
      fileId: upload.public_id,
      url: upload.secure_url || upload.url,
      originalname,
      type: upload.resource_type,
      format: ext,
      size: upload.bytes,
    };
  }

  const dir = path.join(uploadsDir, 'chat');
  ensureDir(dir);

  const filename = `${uniqueId(24)}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), parsed.data);

  return {
    fileId: `chat/${filename}`,
    url: `/uploads/chat/${filename}`,
    originalname,
    type: resourceType,
    format: ext,
    size: parsed.data.length,
  };
};

/**
 * Delete chat attachments. Supports both Cloudinary IDs and local paths.
 */
exports.deleteChatFiles = async (fileIds = []) => {
  if (fileIds.length === 0) return;

  if (configured()) {
    await cloudinary.api
      .delete_resources(fileIds, { resource_type: 'image' })
      .catch(() => {});
    await cloudinary.api
      .delete_resources(fileIds, { resource_type: 'video' })
      .catch(() => {});
    await cloudinary.api
      .delete_resources(fileIds, { resource_type: 'raw' })
      .catch(() => {});
    return;
  }

  fileIds.forEach((fileId) => {
    if (!fileId) return;

    const target = path.resolve(uploadsDir, '..', fileId.replace(/^\//, ''));
    const chatDir = path.join(uploadsDir, 'chat');

    // only delete files inside the uploads directory
    if (target.startsWith(chatDir)) {
      try {
        fs.unlinkSync(target);
      } catch (error0) {
        // ignore missing files
      }
    }
  });
};

function configured() {
  return configureCloudinary();
}

exports.isCloudinaryConfigured = isCloudinaryConfigured;
exports.configureCloudinary = configureCloudinary;
exports.configured = configured;
exports.uploadsDir = uploadsDir;
