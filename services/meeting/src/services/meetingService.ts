import { Meeting, IMeeting } from '../models/Meeting';
import mongoose from 'mongoose';

// DTOs (Data Transfer Objects)
export interface CreateMeetingDTO {
  title: string;
  description?: string;
  fileUrl?: string;
  transcript?: string;
  participants?: Array<{
    userId?: string;
    name: string;
    email?: string;
    role?: string;
  }>;
  scheduledAt?: Date;
  projectId?: string;
}

export interface MeetingResponse {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  transcript?: string;
  actionItems: any[];
  decisions: any[];
  participants: any[];
  status: string;
  sentiment?: any;
  relatedMeetings?: string[];
  projectId?: string;
  createdBy: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class MeetingService {
  /**
   * Create a new meeting
   */
  async createMeeting(userId: string, meetingData: CreateMeetingDTO): Promise<MeetingResponse> {
    try {
      // Validate userId is valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Create meeting document
      const meeting = new Meeting({
        ...meetingData,
        createdBy: new mongoose.Types.ObjectId(userId),
        actionItems: [],
        decisions: [],
        status: 'scheduled',
      });

      // Save to database
      await meeting.save();

      // Return formatted response
      return this.formatMeetingResponse(meeting);
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async getMeetingById(meetingId: string, userId: string): Promise<MeetingResponse> {
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(meetingId)) {
        throw new Error('Invalid meeting ID');
      }

      // Find meeting
      const meeting = await Meeting.findById(meetingId);

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if user has access (created by user or is participant)
      const hasAccess =
        meeting.createdBy.toString() === userId ||
        meeting.participants.some((p) => p.userId?.toString() === userId);

      if (!hasAccess) {
        throw new Error('Access denied to this meeting');
      }

      return this.formatMeetingResponse(meeting);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      throw error;
    }
  }

  /**
   * List all meetings for a user
   */
  async listUserMeetings(
    userId: string,
    filters?: {
      status?: string;
      projectId?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ meetings: MeetingResponse[]; total: number }> {
    try {
      // Validate userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Build query - find meetings created by user or where user is participant
      const query: any = {
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { 'participants.userId': new mongoose.Types.ObjectId(userId) },
        ],
      };

      // Apply filters
      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.projectId) {
        query.projectId = filters.projectId;
      }

      // Get total count
      const total = await Meeting.countDocuments(query);

      // Get meetings with pagination
      const meetings = await Meeting.find(query)
        .sort({ createdAt: -1 }) // Most recent first
        .limit(filters?.limit || 20)
        .skip(filters?.skip || 0);

      return {
        meetings: meetings.map((m) => this.formatMeetingResponse(m)),
        total,
      };
    } catch (error) {
      console.error('Error listing meetings:', error);
      throw error;
    }
  }

  /**
   * Format meeting document to response DTO
   */
  private formatMeetingResponse(meeting: IMeeting): MeetingResponse {
    return {
      id: meeting._id.toString(),
      title: meeting.title,
      description: meeting.description,
      fileUrl: meeting.fileUrl,
      transcript: meeting.transcript,
      actionItems: meeting.actionItems,
      decisions: meeting.decisions,
      participants: meeting.participants,
      status: meeting.status,
      sentiment: meeting.sentiment,
      relatedMeetings: meeting.relatedMeetings?.map((id) => id.toString()),
      projectId: meeting.projectId,
      createdBy: meeting.createdBy.toString(),
      scheduledAt: meeting.scheduledAt,
      startedAt: meeting.startedAt,
      completedAt: meeting.completedAt,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}
