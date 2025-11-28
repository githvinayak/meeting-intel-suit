import mongoose, { Schema, Document } from 'mongoose';

// Interfaces for subdocuments
export interface IActionItem {
  id: string;
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'pending' | 'completed';
}

export interface IDecision {
  id: string;
  description: string;
  madeBy?: string;
  timestamp: Date;
}

export interface IParticipant {
  userId?: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ISentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  emotions?: {
    joy?: number;
    frustration?: number;
    stress?: number;
    engagement?: number;
  };
  burnoutIndicators?: {
    score: number;
    factors: string[];
    recommendations: string[];
  };
}

// Main Meeting Interface
export interface IMeeting extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  fileUrl?: string;
  transcript?: string;

  // Standard fields
  actionItems: IActionItem[];
  decisions: IDecision[];
  participants: IParticipant[];

  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

  // NEW: Advanced features
  sentiment?: ISentimentAnalysis;
  relatedMeetings?: mongoose.Types.ObjectId[];
  projectId?: string;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const MeetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    transcript: {
      type: String,
    },

    actionItems: [
      {
        id: { type: String, required: true },
        description: { type: String, required: true },
        assignedTo: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ['pending', 'completed'],
          default: 'pending',
        },
      },
    ],

    decisions: [
      {
        id: { type: String, required: true },
        description: { type: String, required: true },
        madeBy: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        email: String,
        role: String,
      },
    ],

    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    // NEW: Advanced features
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
      },
      score: {
        type: Number,
        min: -1,
        max: 1,
      },
      emotions: {
        joy: Number,
        frustration: Number,
        stress: Number,
        engagement: Number,
      },
      burnoutIndicators: {
        score: Number,
        factors: [String],
        recommendations: [String],
      },
    },

    relatedMeetings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Meeting',
      },
    ],

    projectId: {
      type: String,
      trim: true,
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for better query performance
MeetingSchema.index({ createdBy: 1, createdAt: -1 });
MeetingSchema.index({ projectId: 1 });
MeetingSchema.index({ status: 1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
