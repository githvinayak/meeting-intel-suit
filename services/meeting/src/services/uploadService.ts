import cloudinary from '../config/storage';
import { validateFileSize } from '../utils/fileValidation';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';
import { JobOrchestrator } from '../orchestration/jobOrchestrator'; // ← ADD THIS
import axios from 'axios'; // ← ADD THIS
import fs from 'fs'; // ← ADD THIS
import path from 'path'; // ← ADD THIS

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
  async downloadFileToTemp(audioPath: string, meetingId: string): Promise<string> {
    // Create temp directory if doesn't exist
    const tempDir = path.join(__dirname, '../../temp/audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Determine file extension from URL
    const urlPath = new URL(audioPath).pathname;
    const ext = path.extname(urlPath) || '.mp3';
    const fileUrl = path.join(tempDir, `${meetingId}${ext}`);

    console.log(`📥 Downloading audio file from Cloudinary...`);
    console.log(`   Source: ${audioPath}`);
    console.log(`   Destination: ${fileUrl}`);

    // Download file
    const response = await axios({
      method: 'get',
      url: audioPath,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(fileUrl);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Audio file downloaded successfully`);
        resolve(fileUrl);
      });
      writer.on('error', (error) => {
        console.error(`❌ Failed to download audio file:`, error);
        reject(error);
      });
    });
  }

  async uploadFileToCloud(params: UploadFileParams): Promise<UploadResult> {
    const { file, title, userId } = params;

    console.log(`\n📤 Starting file upload flow...`);

    // Step 1: Upload to Cloudinary
    console.log(`☁️  Step 1/3: Uploading to Cloudinary...`);
    const audioPath = await this.uploadToCloudinary(file);
    console.log(`✅ File uploaded: ${audioPath}`);

    // Step 2: Create new meeting record
    console.log(`💾 Step 2/3: Creating meeting record...`);
    const meeting = new Meeting({
      title: title || `Meeting - ${new Date().toLocaleDateString()}`,
      fileUrl: audioPath,
      status: 'pending',
      createdBy: userId || new mongoose.Types.ObjectId('000000000000000000000000'),
    });

    await meeting.save();
    console.log(`✅ Meeting created: ${meeting._id}`);

    // Step 3: Download file and start AI pipeline
    console.log(`🤖 Step 3/3: Starting AI processing pipeline...`);
    try {
      const fileUrl = await this.downloadFileToTemp(audioPath, meeting._id.toString());

      // Start the AI pipeline via orchestrator
      await JobOrchestrator.startPipeline(meeting._id.toString(), fileUrl, userId || '');

      console.log(`✅ Upload flow complete!\n`);
    } catch (error: any) {
      console.error(`❌ Failed to start AI pipeline:`, error.message);
      // Don't fail the upload - file is already saved
      // Pipeline will retry automatically via Bull
    }

    // Return structured result
    return {
      meetingId: meeting._id.toString(),
      fileUrl: audioPath,
      fileName: file.originalname,
      fileSize: file.size,
      status: meeting.status,
    };
  }

  async attachFileToMeeting(params: AttachFileParams): Promise<UploadResult> {
    const { file, meetingId, userId } = params;

    console.log(`\n📎 Starting file attachment flow...`);
    console.log(`   Meeting ID: ${meetingId}`);

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

    // Step 1: Upload to Cloudinary
    console.log(`☁️  Step 1/3: Uploading to Cloudinary...`);
    const audioPath = await this.uploadToCloudinary(file);
    console.log(`✅ File uploaded: ${audioPath}`);

    // Step 2: Update meeting record
    console.log(`💾 Step 2/3: Updating meeting record...`);
    meeting.fileUrl = audioPath;
    meeting.status = 'pending'; // Ready for transcription
    await meeting.save();
    console.log(`✅ Meeting updated: ${meeting._id}`);

    // Step 3: Download file and start AI pipeline
    console.log(`🤖 Step 3/3: Starting AI processing pipeline...`);
    try {
      const fileUrl = await this.downloadFileToTemp(audioPath, meeting._id.toString());

      // Start the AI pipeline via orchestrator
      await JobOrchestrator.startPipeline(meeting._id.toString(), fileUrl, userId || '');

      console.log(`✅ Attachment flow complete!\n`);
    } catch (error: any) {
      console.error(`❌ Failed to start AI pipeline:`, error.message);
      // Don't fail the attachment - file is already saved
      // Pipeline will retry automatically via Bull
    }

    // Return structured result
    return {
      meetingId: meeting._id.toString(),
      fileUrl: audioPath,
      fileName: file.originalname,
      fileSize: file.size,
      status: meeting.status,
    };
  }
}
