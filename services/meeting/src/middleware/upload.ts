import multer from 'multer';
import { fileFilter, getMaxFileSizeMB } from '../utils/fileValidation';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// Create multer instance with configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

// Error handling middleware for multer errors
export const handleMulterError = (err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${getMaxFileSizeMB()}MB`,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "file" as the field name',
      });
    }

    // Other multer errors
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Custom errors (from fileFilter)
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};
