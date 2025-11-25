import mongoose, { Schema, Document } from 'mongoose';

// Follow-up interface
export interface IFollowUp {
  meetingId: mongoose.Types.ObjectId;
  discussedAt: Date;
  notes?: string;
  status: 'mentioned' | 'updated' | 'completed';
}

// Main Commitment Interface
export interface ICommitment extends Document {
  description: string;
  assignedTo: mongoose.Types.ObjectId; // User ID
  assignedToName: string; // Cached for display
  
  dueDate?: Date;
  meetingId: mongoose.Types.ObjectId; // Original meeting where commitment was made
  
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  
  // Track commitment across meetings
  followUps: IFollowUp[];
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const CommitmentSchema = new Schema<ICommitment>(
  {
    description: {
      type: String,
      required: [true, 'Commitment description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Commitment must be assigned to someone']
    },
    
    assignedToName: {
      type: String,
      required: true,
      trim: true
    },
    
    dueDate: {
      type: Date
    },
    
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Commitment must be linked to a meeting']
    },
    
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue'],
      default: 'pending'
    },
    
    followUps: [{
      meetingId: {
        type: Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
      },
      discussedAt: {
        type: Date,
        default: Date.now
      },
      notes: String,
      status: {
        type: String,
        enum: ['mentioned', 'updated', 'completed'],
        required: true
      }
    }],
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    completedAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes for performance
CommitmentSchema.index({ assignedTo: 1, status: 1 });
CommitmentSchema.index({ meetingId: 1 });
CommitmentSchema.index({ dueDate: 1 });
CommitmentSchema.index({ createdBy: 1 });

// Middleware to automatically mark as overdue
CommitmentSchema.pre('save', function(next) {
  if (this.dueDate && this.dueDate < new Date() && this.status === 'pending') {
    this.status = 'overdue';
  }
  next();
});

export const Commitment = mongoose.model<ICommitment>('Commitment', CommitmentSchema);