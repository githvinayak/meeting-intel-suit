import { Meeting, IMeeting } from '../models/Meeting';
import mongoose from 'mongoose';

interface SearchFilters {
  query?: string; // Full-text search in title, description, transcript
  status?: string[]; // Filter by status
  dateFrom?: Date; // Filter by date range
  dateTo?: Date;
  sentiment?: string[]; // Filter by sentiment (positive, neutral, negative)
  createdBy?: string; // Filter by user
  projectId?: string; // Filter by project
  hasActionItems?: boolean; // Only meetings with action items
  page?: number; // Pagination
  limit?: number;
  sortBy?: string; // Sort field (createdAt, scheduledAt, etc.)
  sortOrder?: 'asc' | 'desc';
}

interface SearchResult {
  meetings: IMeeting[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export class SearchService {
  /**
   * Search meetings with advanced filters
   */
  async searchMeetings(filters: SearchFilters): Promise<SearchResult> {
    const {
      query,
      status,
      dateFrom,
      dateTo,
      sentiment,
      createdBy,
      projectId,
      hasActionItems,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const searchQuery: any = {};

    // Full-text search (title, description, transcript)
    if (query && query.trim()) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'transcript.fullText': { $regex: query, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status.length > 0) {
      searchQuery.status = { $in: status };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom) {
        searchQuery.createdAt.$gte = dateFrom;
      }
      if (dateTo) {
        searchQuery.createdAt.$lte = dateTo;
      }
    }

    // Sentiment filter
    if (sentiment && sentiment.length > 0) {
      searchQuery['sentiment.overall'] = { $in: sentiment };
    }

    // User filter
    if (createdBy) {
      searchQuery.createdBy = new mongoose.Types.ObjectId(createdBy);
    }

    // Project filter
    if (projectId) {
      searchQuery.projectId = projectId;
    }

    // Has action items filter
    if (hasActionItems) {
      searchQuery['actionItems.0'] = { $exists: true };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [meetings, total] = await Promise.all([
      Meeting.find(searchQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      Meeting.countDocuments(searchQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      meetings: meetings as unknown as IMeeting[],
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Get meeting statistics
   */
  async getMeetingStats(userId?: string): Promise<any> {
    const query: any = userId ? { createdBy: new mongoose.Types.ObjectId(userId) } : {};

    const [
      totalMeetings,
      completedMeetings,
      pendingMeetings,
      totalActionItems,
      completedActionItems,
      sentimentBreakdown,
    ] = await Promise.all([
      // Total meetings
      Meeting.countDocuments(query),

      // Completed meetings
      Meeting.countDocuments({ ...query, status: 'completed' }),

      // Pending meetings
      Meeting.countDocuments({
        ...query,
        status: { $in: ['pending', 'processing', 'transcribed'] },
      }),

      // Total action items
      Meeting.aggregate([{ $match: query }, { $unwind: '$actionItems' }, { $count: 'total' }]).then(
        (result) => result[0]?.total || 0
      ),

      // Completed action items
      Meeting.aggregate([
        { $match: query },
        { $unwind: '$actionItems' },
        { $match: { 'actionItems.status': 'completed' } },
        { $count: 'total' },
      ]).then((result) => result[0]?.total || 0),

      // Sentiment breakdown
      Meeting.aggregate([
        { $match: { ...query, 'sentiment.overall': { $exists: true } } },
        { $group: { _id: '$sentiment.overall', count: { $sum: 1 } } },
      ]),
    ]);

    // Average burnout score
    const avgBurnout = await Meeting.aggregate([
      { $match: { ...query, 'sentiment.burnoutIndicators.score': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$sentiment.burnoutIndicators.score' },
        },
      },
    ]);

    return {
      totalMeetings,
      completedMeetings,
      pendingMeetings,
      completionRate: totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0,
      actionItems: {
        total: totalActionItems,
        completed: completedActionItems,
        completionRate: totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0,
      },
      sentiment: {
        breakdown: sentimentBreakdown.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      burnout: {
        averageScore: avgBurnout[0]?.avgScore || 0,
      },
    };
  }

  /**
   * Get recent meetings
   */
  async getRecentMeetings(userId: string, limit: number = 10): Promise<IMeeting[]> {
    const meetings = await Meeting.find({ createdBy: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();

    return meetings as unknown as IMeeting[];
  }
}
