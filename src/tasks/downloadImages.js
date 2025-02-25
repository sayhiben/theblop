/* src/tasks/downloadImages.js */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

export async function downloadImageIfNeeded(imgUrl, uuid, imagesDir) {
  if (!imgUrl) return;

  const existingFiles = fs.readdirSync(imagesDir);
  const uuidNoExt = uuid.replace(/\.[^.]+$/, '');
  const existingFile = existingFiles.find((f) => f.startsWith(uuidNoExt));
  if (existingFile) {
    console.log(`[DownloadImage] Already exists: ${existingFile}, skipping download.`);
    return path.join(imagesDir, existingFile);
  }

  console.log(`\n[DownloadImage] Checking: ${imgUrl}`);
  try {
    const response = await axios.get(imgUrl, { responseType: 'arraybuffer', maxRedirects: 5 });
    const contentType = response.headers['content-type'] || '';

    const contentTypeExtMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    const ext = contentTypeExtMap[contentType] || '.jpg';

    const localPath = path.join(imagesDir, `${uuid}${ext}`);
    if (fs.existsSync(localPath)) {
      console.log(`[DownloadImage] Already exists: ${localPath}, skipping download.`);
      return localPath;
    }

    fs.writeFileSync(localPath, response.data);
    console.log(`[DownloadImage] Saved: ${localPath}`);
    return localPath;
  } catch (err) {
    console.error(`[DownloadImage] Failed to download image from: ${imgUrl}`);
    console.error(err.message);
    return undefined;
  }
}

export async function resizeImageIfNeeded(imgPath, uuid, imagesDir) {
  if (!imgPath) return;

  const thumbPath = path.join(imagesDir, `${uuid}-thumb.jpg`);
  if (fs.existsSync(thumbPath)) {
    console.log(`[ResizeImage] Already exists: ${thumbPath}, skipping resize.`);
    return thumbPath;
  }

  try {
    await sharp(imgPath)
      .resize(400, 800, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbPath);
    console.log(`[ResizeImage] Saved thumbnail: ${thumbPath}`);
    return thumbPath;
  } catch (err) {
    console.error(`[ResizeImage] Failed to resize image: ${imgPath}`);
    console.error(err.message);
    return undefined;
  }
}
