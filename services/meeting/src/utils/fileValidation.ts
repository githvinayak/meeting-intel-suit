import { Request } from 'express';
import multer from 'multer';

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',        // .mp3
  'audio/mp4',         // .m4a
  'audio/wav',         // .wav
  'audio/x-wav',       // .wav (alternative)
  'video/mp4',         // .mp4
  'video/webm',        // .webm
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.mp3', '.mp4', '.wav', '.m4a', '.webm'];

// Max file size: 500MB in bytes
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Validates file type based on mimetype and extension
 */
export const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Check mimetype
  const isMimeTypeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
  
  // Check file extension
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  const isExtensionValid = ALLOWED_EXTENSIONS.includes(fileExtension);

  if (isMimeTypeValid && isExtensionValid) {
    // File is valid
    cb(null, true);
  } else {
    // File is invalid
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

/**
 * Validates file size
 */
export const validateFileSize = (fileSize: number): boolean => {
  return fileSize <= MAX_FILE_SIZE;
};

/**
 * Get max file size in MB for error messages
 */
export const getMaxFileSizeMB = (): number => {
  return MAX_FILE_SIZE / (1024 * 1024);
};