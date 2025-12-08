import { openai } from '../config/openai';
import { Commitment, ICommitment } from '../models/Commitment';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';

// Cost tracking
const GPT4_INPUT_COST = 0.03 / 1000;
const GPT4_OUTPUT_COST = 0.06 / 1000;

interface FollowUpDetection {
  commitmentId: string;
  mentioned: boolean;
  status: 'mentioned' | 'updated' | 'completed';
  notes?: string;
  confidence: number; // 0-1
}

interface FollowUpDetectionResult {
  detections: FollowUpDetection[];
  cost: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export class CommitmentService {
  /**
   * Create commitment from action item
   */ async createCommitmentFromActionItem(
    meetingId: string,
    actionItemId: string,
    userId: string
  ): Promise<ICommitment> {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const actionItem = meeting.actionItems.find((item) => item.id === actionItemId);
    if (!actionItem) {
      throw new Error('Action item not found');
    }

    if (!actionItem.assignedTo) {
      throw new Error('Action item must have an assignee to create a commitment');
    }

    // Check if commitment already exists for this action item
    const existingCommitment = await Commitment.findOne({
      originalActionItemId: actionItemId,
      meetingId: new mongoose.Types.ObjectId(meetingId),
    });

    if (existingCommitment) {
      return existingCommitment;
    }

    // Create new commitment
    const commitment = new Commitment({
      description: actionItem.description,
      assignedTo: new mongoose.Types.ObjectId(userId), // In real app, lookup user by name
      assignedToName: actionItem.assignedTo,
      dueDate: actionItem.dueDate,
      meetingId: new mongoose.Types.ObjectId(meetingId),
      originalActionItemId: actionItemId,
      status: actionItem.status === 'completed' ? 'completed' : 'pending',
      priority: actionItem.priority,
      createdBy: new mongoose.Types.ObjectId(userId),
      completedAt: actionItem.status === 'completed' ? new Date() : undefined,
    });

    await commitment.save();
    console.log(`✅ Commitment created from action item: ${actionItemId}`);

    return commitment;
  }

  /**
   * Detect commitment follow-ups in meeting transcript using GPT-4
   */
  async detectCommitmentFollowUps(
    meetingId: string,
    transcript: string,
    userId: string
  ): Promise<FollowUpDetectionResult> {
    console.log(`🔍 Detecting commitment follow-ups in meeting ${meetingId}...`);

    // Get all active commitments for this user
    const activeCommitments = await Commitment.find({
      createdBy: new mongoose.Types.ObjectId(userId),
      status: { $nin: ['completed', 'cancelled'] },
    }).limit(20); // Limit to avoid token limits

    if (activeCommitments.length === 0) {
      console.log('No active commitments to track');
      return {
        detections: [],
        cost: 0,
        tokensUsed: { input: 0, output: 0 },
      };
    }

    // Build GPT-4 prompt
    const commitmentsList = activeCommitments
      .map(
        (c, index) =>
          `${index + 1}. ID: ${c._id}
   Description: ${c.description}
   Assigned to: ${c.assignedToName}
   Status: ${c.status}
   Due: ${c.dueDate ? c.dueDate.toISOString().split('T')[0] : 'No due date'}`
      )
      .join('\n\n');

    const prompt = `
You are analyzing a meeting transcript to detect follow-ups on existing commitments.

ACTIVE COMMITMENTS:
${commitmentsList}

MEETING TRANSCRIPT:
${transcript}

For each commitment, determine if it was mentioned in the transcript. Return JSON array with:

[
  {
    "commitmentId": "actual_mongodb_id",
    "mentioned": true/false,
    "status": "mentioned" | "updated" | "completed",
    "notes": "Brief summary of what was discussed (1 sentence)",
    "confidence": 0.0 to 1.0
  }
]

Status guidelines:
- "mentioned": Briefly referenced or discussed
- "updated": Progress was reported or status changed
- "completed": Explicitly marked as done or finished

Only include commitments that were actually mentioned (mentioned: true).
If no commitments were mentioned, return empty array: []

Return ONLY valid JSON, no markdown, no explanation.
`.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at analyzing meeting transcripts to track commitment follow-ups. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '[]';

      // Parse response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse follow-up detection JSON:', content);
        parsed = [];
      }

      // Extract array
      const detections: FollowUpDetection[] = Array.isArray(parsed)
        ? parsed
        : parsed.detections || [];

      // Filter only mentioned commitments
      const mentionedDetections = detections.filter((d) => d.mentioned);

      // Calculate cost
      const tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      };
      const cost = tokensUsed.input * GPT4_INPUT_COST + tokensUsed.output * GPT4_OUTPUT_COST;

      console.log(`✅ Detected ${mentionedDetections.length} commitment follow-ups`);
      console.log(`💰 Follow-up detection cost: $${cost.toFixed(4)}`);

      return {
        detections: mentionedDetections,
        cost,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Follow-up detection failed:', error.message);
      throw new Error(`Follow-up detection failed: ${error.message}`);
    }
  }

  /**
   * Process follow-up detections and update commitments
   */
  async processFollowUpDetections(
    meetingId: string,
    detections: FollowUpDetection[]
  ): Promise<void> {
    console.log(`📝 Processing ${detections.length} follow-up detections...`);

    for (const detection of detections) {
      try {
        const commitment = await Commitment.findById(detection.commitmentId);
        if (!commitment) {
          console.warn(`⚠️ Commitment ${detection.commitmentId} not found`);
          continue;
        }

        // Add follow-up
        await commitment.addFollowUp(
          new mongoose.Types.ObjectId(meetingId),
          detection.status,
          detection.notes,
          'gpt-4'
        );

        console.log(
          `✅ Added follow-up to commitment "${commitment.description}" (status: ${detection.status})`
        );
      } catch (error: any) {
        console.error(
          `❌ Failed to process detection for ${detection.commitmentId}:`,
          error.message
        );
      }
    }
  }

  /**
   * Get overdue commitments
   */
  async getOverdueCommitments(userId?: string): Promise<ICommitment[]> {
    const userIdObj = userId ? new mongoose.Types.ObjectId(userId) : undefined;
    return Commitment.findOverdue(userIdObj);
  }

  /**
   * Get completion rate for a person
   */
  async getCompletionRate(assignedToName: string): Promise<any> {
    return Commitment.getCompletionRate(undefined, assignedToName);
  }

  /**
   * Get commitment statistics
   */
  async getCommitmentStats(userId: string): Promise<any> {
    return Commitment.getStats(new mongoose.Types.ObjectId(userId));
  }

  /**
   * Get commitment history (all follow-ups)
   */
  async getCommitmentHistory(commitmentId: string): Promise<any> {
    const commitment = await Commitment.findById(commitmentId)
      .populate('meetingId', 'title createdAt')
      .populate({
        path: 'followUps.meetingId',
        select: 'title createdAt',
      });

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    return {
      commitment: {
        id: commitment._id,
        description: commitment.description,
        assignedToName: commitment.assignedToName,
        status: commitment.status,
        priority: commitment.priority,
        dueDate: commitment.dueDate,
        createdAt: commitment.createdAt,
        originalMeeting: commitment.meetingId,
        mentionCount: commitment.mentionCount,
        lastMentionedAt: commitment.lastMentionedAt,
      },
      followUps: commitment.followUps.map((fu) => ({
        meeting: fu.meetingId,
        discussedAt: fu.discussedAt,
        status: fu.status,
        notes: fu.notes,
        detectedBy: fu.detectedBy,
      })),
    };
  }
}
