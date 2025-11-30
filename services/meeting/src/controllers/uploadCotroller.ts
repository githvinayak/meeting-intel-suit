import { Response } from 'express';
import { getMaxFileSizeMB } from '../utils/fileValidation';
import { UploadService } from '../services/uploadService';
import { AuthenticatedRequest } from '../middleware/authenticate';

/**
 * FLOW 2: Upload file and create new meeting
 * POST /api/meetings/upload
 * Body: multipart/form-data with 'file' field
 * Optional: title (string)
 */
const uploadService = new UploadService();

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check if file exists
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please provide a file in the "file" field.',
      });
      return;
    }

    // Get optional fields from body
    const { title } = req.body;
    const userId = req.user?.userId; // From auth middleware (if implemented)

    // Call service layer
    const result = await uploadService.uploadFileToCloud({
      file: req.file,
      title,
      userId,
    });

    // Send success response
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully. Meeting created.',
      data: result,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Handle specific errors
    if (error.message.includes('File size exceeds')) {
      res.status(400).json({
        success: false,
        message: `File size exceeds ${getMaxFileSizeMB()}MB limit`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
    });
  }
};

/**
 * FLOW 1: Attach file to existing meeting (PRIMARY - Day 9 Goal)
 * PATCH /api/meetings/:id/upload
 * Body: multipart/form-data with 'file' field
 */
export const attachFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check if file exists
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please provide a file in the "file" field.',
      });
      return;
    }

    // Get meeting ID from params
    const { id: meetingId } = req.params;
    const userId = req.user?.userId; // From auth middleware

    // Call service layer
    const result = await uploadService.attachFileToMeeting({
      file: req.file,
      meetingId,
      userId,
    });

    // Send success response
    res.status(200).json({
      success: true,
      message: 'File attached to meeting successfully. Status updated to pending.',
      data: result,
    });
  } catch (error: any) {
    console.error('Attach file error:', error);

    // Handle specific errors
    if (error.message === 'Meeting not found') {
      res.status(404).json({
        success: false,
        message: 'Meeting not found with the provided ID',
      });
      return;
    }

    if (error.message === 'Invalid meeting ID format') {
      res.status(400).json({
        success: false,
        message: 'Invalid meeting ID format. Must be a valid MongoDB ObjectId.',
      });
      return;
    }

    if (error.message.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to upload files to this meeting',
      });
      return;
    }

    if (error.message.includes('already has a file')) {
      res.status(409).json({
        success: false,
        message: 'This meeting already has a file attached',
      });
      return;
    }

    if (error.message.includes('File size exceeds')) {
      res.status(400).json({
        success: false,
        message: `File size exceeds ${getMaxFileSizeMB()}MB limit`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to attach file to meeting',
      error: error.message,
    });
  }
};
