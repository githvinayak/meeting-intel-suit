import mongoose, { Schema, Document, Model } from 'mongoose';

// Follow-up interface
export interface IFollowUp {
  meetingId: mongoose.Types.ObjectId;
  discussedAt: Date;
  notes?: string;
  status: 'mentioned' | 'updated' | 'completed';
  detectedBy: 'gpt-4' | 'manual';
}

// Main Commitment Interface
export interface ICommitment extends Document {
  description: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string;

  dueDate?: Date;
  meetingId: mongoose.Types.ObjectId;
  originalActionItemId?: string;

  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'high' | 'medium' | 'low';

  followUps: IFollowUp[];
  lastMentionedAt?: Date;
  mentionCount: number;

  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // ← ADD: Instance method declarations
  addFollowUp(
    meetingId: mongoose.Types.ObjectId,
    status: 'mentioned' | 'updated' | 'completed',
    notes?: string,
    detectedBy?: 'gpt-4' | 'manual'
  ): Promise<this>;

  // Virtual property
  isOverdue: boolean;
}

// ← ADD: Model interface with static methods
export interface ICommitmentModel extends Model<ICommitment> {
  findOverdue(userId?: mongoose.Types.ObjectId): Promise<ICommitment[]>;
  getCompletionRate(
    assignedTo?: mongoose.Types.ObjectId,
    assignedToName?: string
  ): Promise<{
    total: number;
    completed: number;
    pending: number;
    rate: number;
  }>;
  getStats(userId: mongoose.Types.ObjectId): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionRate: number;
    avgMentionsPerCommitment: number;
  }>;
}

// Mongoose Schema
const CommitmentSchema = new Schema<ICommitment, ICommitmentModel>(
  {
    description: {
      type: String,
      required: [true, 'Commitment description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Commitment must be assigned to someone'],
    },

    assignedToName: {
      type: String,
      required: true,
      trim: true,
    },

    dueDate: {
      type: Date,
    },

    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Commitment must be linked to a meeting'],
    },

    originalActionItemId: {
      type: String,
    },

    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'],
      default: 'pending',
    },

    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },

    followUps: [
      {
        meetingId: {
          type: Schema.Types.ObjectId,
          ref: 'Meeting',
          required: true,
        },
        discussedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
        status: {
          type: String,
          enum: ['mentioned', 'updated', 'completed'],
          required: true,
        },
        detectedBy: {
          type: String,
          enum: ['gpt-4', 'manual'],
          default: 'gpt-4',
        },
      },
    ],

    lastMentionedAt: Date,

    mentionCount: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CommitmentSchema.index({ assignedTo: 1, status: 1 });
CommitmentSchema.index({ assignedToName: 1, status: 1 });
CommitmentSchema.index({ meetingId: 1 });
CommitmentSchema.index({ dueDate: 1, status: 1 });
CommitmentSchema.index({ createdBy: 1 });
CommitmentSchema.index({ lastMentionedAt: 1 });

// Middleware to automatically mark as overdue
CommitmentSchema.pre('save', function (next) {
  if (this.dueDate && this.dueDate < new Date() && this.status === 'pending') {
    this.status = 'overdue';
  }
  next();
});

// Virtual for checking if overdue
CommitmentSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Instance method to add follow-up
CommitmentSchema.methods.addFollowUp = async function (
  meetingId: mongoose.Types.ObjectId,
  status: 'mentioned' | 'updated' | 'completed',
  notes?: string,
  detectedBy: 'gpt-4' | 'manual' = 'gpt-4'
) {
  this.followUps.push({
    meetingId,
    discussedAt: new Date(),
    status,
    notes,
    detectedBy,
  });

  this.lastMentionedAt = new Date();
  this.mentionCount = (this.mentionCount || 0) + 1;

  if (status === 'completed' && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (status === 'updated' && this.status === 'pending') {
    this.status = 'in-progress';
  }

  return this.save();
};

// Static method to find overdue commitments
CommitmentSchema.statics.findOverdue = function (userId?: mongoose.Types.ObjectId) {
  const now = new Date();
  const query: any = {
    dueDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] },
  };

  if (userId) {
    query.createdBy = userId;
  }

  return this.find(query).populate('assignedTo', 'name email').populate('meetingId', 'title');
};

// Static method to get completion rate
CommitmentSchema.statics.getCompletionRate = async function (
  assignedTo?: mongoose.Types.ObjectId,
  assignedToName?: string
) {
  const query: any = {};

  if (assignedTo) {
    query.assignedTo = assignedTo;
  } else if (assignedToName) {
    query.assignedToName = assignedToName;
  }

  const [total, completed] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, status: 'completed' }),
  ]);

  return {
    total,
    completed,
    pending: total - completed,
    rate: total > 0 ? (completed / total) * 100 : 0,
  };
};

// Static method to get commitment statistics
CommitmentSchema.statics.getStats = async function (userId: mongoose.Types.ObjectId) {
  const [total, pending, inProgress, completed, overdue, avgMentions] = await Promise.all([
    this.countDocuments({ createdBy: userId }),
    this.countDocuments({ createdBy: userId, status: 'pending' }),
    this.countDocuments({ createdBy: userId, status: 'in-progress' }),
    this.countDocuments({ createdBy: userId, status: 'completed' }),
    this.countDocuments({ createdBy: userId, status: 'overdue' }),
    this.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, avgMentions: { $avg: '$mentionCount' } } },
    ]).then((result) => result[0]?.avgMentions || 0),
  ]);

  return {
    total,
    pending,
    inProgress,
    completed,
    overdue,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    avgMentionsPerCommitment: avgMentions,
  };
};

// ← UPDATED: Export with proper typing
export const Commitment = mongoose.model<ICommitment, ICommitmentModel>(
  'Commitment',
  CommitmentSchema
);
