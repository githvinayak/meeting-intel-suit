import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';

// DEBUG: Check if env vars are loaded
console.log('🔍 Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME:', config.cloudinary.cloudName ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', config.cloudinary.apiKey ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', config.cloudinary.apiSecret ? '✅ Set' : '❌ Missing');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export default cloudinary;
