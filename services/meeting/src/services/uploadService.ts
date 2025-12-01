import cloudinary from '../config/storage';
import { validateFileSize } from '../utils/fileValidation';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';
import { addTranscriptionJob, JobPriority } from '../queue/aiQueue';

interface UploadFileParams {
  file: Express.Multer.File;
  title?: string;
  userId?: string;
}

interface AttachFileParams {
  file: Express.Multer.File;
  meetingId: string;
  userId?: string;
}

interface UploadResult {
  meetingId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: string;
}

export class UploadService {
  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    // Validate file size
    if (!validateFileSize(file.size)) {
      throw new Error('File size exceeds maximum limit');
    }

    // Upload to Cloudinary using stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // auto-detect audio/video
          folder: 'meeting-recordings',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Pipe file buffer to Cloudinary
      uploadStream.end(file.buffer);
    });

    return uploadResult.secure_url;
  }

  async uploadFileToCloud(params: UploadFileParams): Promise<UploadResult> {
    const { file, title, userId } = params;

    // Upload to Cloudinary
    const fileUrl = await this.uploadToCloudinary(file);

    // Create new meeting record
    const meeting = new Meeting({
      title: title || `Meeting - ${new Date().toLocaleDateString()}`,
      fileUrl: fileUrl,
      status: 'pending',
      createdBy: userId || new mongoose.Types.ObjectId('000000000000000000000000'),
    });

    await meeting.save();

    await addTranscriptionJob(
      {
        meetingId: meeting._id.toString(),
        fileUrl: fileUrl,
        fileSize: file.size,
        userId: userId,
        createdAt: new Date(),
      },
      JobPriority.NORMAL
    );
    // Return structured result
    return {
      meetingId: meeting._id.toString(),
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      status: meeting.status,
    };
  }

  async attachFileToMeeting(params: AttachFileParams): Promise<UploadResult> {
    const { file, meetingId, userId } = params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      throw new Error('Invalid meeting ID format');
    }

    // Find existing meeting
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Check ownership (if userId provided)
    if (userId && meeting.createdBy && meeting.createdBy.toString() !== userId) {
      throw new Error('Unauthorized: You do not own this meeting');
    }

    // Check if meeting already has a file
    if (meeting.fileUrl) {
      throw new Error('Meeting already has a file attached. Delete the existing file first.');
    }

    // Upload to Cloudinary
    const fileUrl = await this.uploadToCloudinary(file);

    // Update meeting record
    meeting.fileUrl = fileUrl;
    meeting.status = 'pending'; // Ready for transcription
    await meeting.save();

    await addTranscriptionJob(
      {
        meetingId: meeting._id.toString(),
        fileUrl: fileUrl,
        fileSize: file.size,
        userId: userId,
        createdAt: new Date(),
      },
      JobPriority.NORMAL
    );
    // Return structured result
    return {
      meetingId: meeting._id.toString(),
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      status: meeting.status,
    };
  }
}
