import { Meeting, IMeeting } from '../models/Meeting';
import mongoose from 'mongoose';
import { getMeetingJobs } from '../queue/aiQueue';

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

export interface jobStatuses {
  id: string;
  type: string;
  status: string; // 'waiting', 'active', 'completed', 'failed'
  progress: number;
  failedReason: string | null;
  createdAt: Date;
  processedAt: Date | null;
  finishedAt: Date | null;
  attemptsMade: number | 0;
}
export interface MeetingStatusResponse {
  meetingId: string;
  meetingStatus: string;
  statusMessage: string;
  overallProgress: number;
  jobs: {
    total: number;
    completed: any[] | number;
    active: any[] | number;
    waiting: any[] | number;
    failed: any[] | number;
  };
  jobDetails: jobStatuses[];
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

  async getMeetingStatus(meetingId: { meetingId: string }): Promise<MeetingStatusResponse> {
    const { meetingId: id } = meetingId;
    // Validate meetingId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid meeting ID');
    }

    const meeting = await Meeting.findById(id);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Get all jobs for this meeting
    const jobs = await getMeetingJobs(id);

    // Format job statuses
    const jobStatuses = await Promise.all(
      jobs.map(async (job: any) => {
        const state = await job.getState();
        const progress = job.progress();
        const failedReason = job.failedReason;

        return {
          id: job.id,
          type: job.name,
          status: state, // 'waiting', 'active', 'completed', 'failed'
          progress: progress || 0,
          failedReason: failedReason || null,
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          attemptsMade: job.attemptsMade || 0,
        };
      })
    );

    // Calculate overall progress
    const totalJobs = jobStatuses.length;
    const completedJobs = jobStatuses.filter((j: any) => j.status === 'completed').length;
    const failedJobs = jobStatuses.filter((j: any) => j.status === 'failed').length;
    const activeJobs = jobStatuses.filter((j: any) => j.status === 'active').length;
    const waitingJobs = jobStatuses.filter((j: any) => j.status === 'waiting').length;

    const overallProgress = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // Determine overall status message
    let statusMessage = '';
    if (meeting.status === 'completed') {
      statusMessage = 'All processing completed';
    } else if (activeJobs > 0) {
      statusMessage = 'Processing in progress';
    } else if (waitingJobs > 0) {
      statusMessage = 'Waiting in queue';
    } else if (failedJobs > 0) {
      statusMessage = 'Some jobs failed';
    } else {
      statusMessage = 'Ready';
    }
    return {
      meetingId: meeting._id.toString(),
      meetingStatus: meeting.status,
      statusMessage,
      overallProgress,
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        active: activeJobs,
        waiting: waitingJobs,
        failed: failedJobs,
      },
      jobDetails: jobStatuses,
    };
  }
}
