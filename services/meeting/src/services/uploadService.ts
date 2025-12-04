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
  async downloadFileToTemp(fileUrl: string, meetingId: string): Promise<string> {
    const tempDir = path.join(__dirname, '../../temp/audio');

    // Create temp directory if doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Determine file extension from URL
    const urlPath = new URL(fileUrl).pathname;
    const ext = path.extname(urlPath) || '.mp3';
    const audioPath = path.join(tempDir, `${meetingId}${ext}`);

    console.log(`📥 Downloading audio file from Cloudinary...`);
    console.log(`   Source: ${fileUrl}`);
    console.log(`   Destination: ${audioPath}`);

    // Download file
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(audioPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Audio file downloaded successfully`);
        resolve(audioPath);
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
      await JobOrchestrator.startPipeline(meeting._id.toString(), fileUrl, file.size, userId || '');

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

    // Validate meeting exists
    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      throw new Error('Invalid meeting ID format');
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (userId && meeting.createdBy && meeting.createdBy.toString() !== userId) {
      throw new Error('Unauthorized: You do not own this meeting');
    }

    if (meeting.fileUrl) {
      throw new Error('Meeting already has a file attached');
    }

    // Upload to Cloudinary
    console.log(`☁️  Step 1/2: Uploading to Cloudinary...`);
    const fileUrl = await this.uploadToCloudinary(file);
    console.log(`✅ File uploaded: ${fileUrl}`);

    // Update meeting
    console.log(`💾 Step 2/2: Updating meeting record...`);
    meeting.fileUrl = fileUrl;
    meeting.status = 'pending';
    await meeting.save();

    // Start AI pipeline
    console.log(`🤖 Starting AI processing pipeline...`);
    try {
      await JobOrchestrator.startPipeline(
        meeting._id.toString(),
        fileUrl, // ← Pass Cloudinary URL
        file.size, // ← Pass file size
        userId || ''
      );

      console.log(`✅ Attachment flow complete!\n`);
    } catch (error: any) {
      console.error(`❌ Failed to start AI pipeline:`, error.message);
    }

    return {
      meetingId: meeting._id.toString(),
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      status: meeting.status,
    };
  }
}
