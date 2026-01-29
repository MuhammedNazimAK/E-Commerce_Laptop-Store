const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImages = async (images) => {
  try {
  if (!images || images.length === 0) {
    throw new Error('No valid images provided for upload');
  }

  if (images.length > 5) {
    throw new Error('Maximum 5 images allowed');
  }

  const uploadPromises = images.map(async (image) => {
    if (!image || !image.tempFilePath || !fs.existsSync(image.tempFilePath)) {
      console.error('Invalid image:', image);
      return null;
    }

    try {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
         folder: 'products',
         resource_type: 'image',
         quality: 'auto',
         fetch_format: 'auto',
        });

        fs.unlinkSync(image.tempFilePath);

      return result.secure_url;
    } catch (error) {
      console.error('Error during image upload:', image.name, error, error.stack);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  const successfulUploads = results.filter(result => result !== null);

  if (successfulUploads.length === 0) {
    throw new Error('No images were uploaded successfully');
  }

  return successfulUploads;
} catch (error) {
  console.error('Error uploading images:', error);
  throw error;
 }
};


module.exports = { uploadImages, cloudinary };