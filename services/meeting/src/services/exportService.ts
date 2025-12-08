import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { format } from 'date-fns';
import { IMeeting } from '../models/Meeting';

export class ExportService {
  /**
   * Generate PDF export of meeting
   */
  async exportToPDF(meeting: IMeeting): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).text(meeting.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Date: ${format(meeting.createdAt, 'PPP')}`, { align: 'center' });
        doc.text(`Status: ${meeting.status}`, { align: 'center' });
        doc.moveDown(2);

        // Description
        if (meeting.description) {
          doc.fontSize(12).text('Description:', { underline: true });
          doc.fontSize(10).text(meeting.description);
          doc.moveDown();
        }

        // Participants
        if (meeting.participants && meeting.participants.length > 0) {
          doc.fontSize(12).text('Participants:', { underline: true });
          meeting.participants.forEach((p) => {
            doc.fontSize(10).text(`• ${p.name}${p.email ? ` (${p.email})` : ''}`);
          });
          doc.moveDown();
        }

        // Action Items
        if (meeting.actionItems && meeting.actionItems.length > 0) {
          doc.fontSize(14).text('Action Items', { underline: true });
          doc.moveDown(0.5);
          meeting.actionItems.forEach((item, index) => {
            doc.fontSize(11).text(`${index + 1}. ${item.description}`, { continued: false });
            if (item.assignedTo) {
              doc.fontSize(9).text(`   Assigned to: ${item.assignedTo}`);
            }
            doc
              .fontSize(9)
              .text(`   Priority: ${item.priority.toUpperCase()} | Status: ${item.status}`);
            if (item.dueDate) {
              doc.text(`   Due: ${format(new Date(item.dueDate), 'PP')}`);
            }
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Decisions
        if (meeting.decisions && meeting.decisions.length > 0) {
          doc.fontSize(14).text('Key Decisions', { underline: true });
          doc.moveDown(0.5);
          meeting.decisions.forEach((decision, index) => {
            doc.fontSize(11).text(`${index + 1}. ${decision.description}`);
            if (decision.madeBy) {
              doc.fontSize(9).text(`   Made by: ${decision.madeBy}`);
            }
            doc.fontSize(9).text(`   Impact: ${decision.impact.toUpperCase()}`);
            if (decision.context) {
              doc.fontSize(9).text(`   Context: ${decision.context}`);
            }
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Sentiment Analysis
        if (meeting.sentiment) {
          doc.fontSize(14).text('Sentiment Analysis', { underline: true });
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .text(
              `Overall: ${meeting.sentiment.overall.toUpperCase()} (${meeting.sentiment.score.toFixed(2)})`
            );

          if (meeting.sentiment.emotions) {
            doc.text('Emotions:');
            doc.text(`  Joy: ${((meeting.sentiment.emotions.joy ?? 0) * 100).toFixed(1)}%`);
            doc.text(
              `  Frustration: ${((meeting.sentiment.emotions.frustration ?? 0) * 100).toFixed(1)}%`
            );
            doc.text(`  Stress: ${((meeting.sentiment.emotions.stress ?? 0) * 100).toFixed(1)}%`);
            doc.text(
              `  Engagement: ${((meeting.sentiment.emotions.engagement ?? 0) * 100).toFixed(1)}%`
            );
          }

          if (meeting.sentiment.burnoutIndicators) {
            doc.moveDown(0.5);
            doc.text(`Burnout Score: ${meeting.sentiment.burnoutIndicators.score}/100`);

            if (meeting.sentiment.burnoutIndicators.factors.length > 0) {
              doc.text('Concerning Factors:');
              meeting.sentiment.burnoutIndicators.factors.forEach((factor) => {
                doc.text(`  • ${factor}`);
              });
            }
          }
          doc.moveDown();
        }

        // Transcript
        if (meeting.transcript?.fullText) {
          doc.addPage();
          doc.fontSize(14).text('Transcript', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(9).text(meeting.transcript.fullText, {
            align: 'left',
            lineGap: 2,
          });
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Markdown export of meeting
   */
  exportToMarkdown(meeting: IMeeting): string {
    let markdown = '';

    // Header
    markdown += `# ${meeting.title}\n\n`;
    markdown += `**Date:** ${format(meeting.createdAt, 'PPP')}\n`;
    markdown += `**Status:** ${meeting.status}\n\n`;

    // Description
    if (meeting.description) {
      markdown += `## Description\n\n${meeting.description}\n\n`;
    }

    // Participants
    if (meeting.participants && meeting.participants.length > 0) {
      markdown += `## Participants\n\n`;
      meeting.participants.forEach((p) => {
        markdown += `- ${p.name}${p.email ? ` (${p.email})` : ''}\n`;
      });
      markdown += '\n';
    }

    // Action Items
    if (meeting.actionItems && meeting.actionItems.length > 0) {
      markdown += `## Action Items\n\n`;
      meeting.actionItems.forEach((item, index) => {
        markdown += `${index + 1}. **${item.description}**\n`;
        if (item.assignedTo) {
          markdown += `   - Assigned to: ${item.assignedTo}\n`;
        }
        markdown += `   - Priority: ${item.priority.toUpperCase()} | Status: ${item.status}\n`;
        if (item.dueDate) {
          markdown += `   - Due: ${format(new Date(item.dueDate), 'PP')}\n`;
        }
        markdown += '\n';
      });
    }

    // Decisions
    if (meeting.decisions && meeting.decisions.length > 0) {
      markdown += `## Key Decisions\n\n`;
      meeting.decisions.forEach((decision, index) => {
        markdown += `${index + 1}. **${decision.description}**\n`;
        if (decision.madeBy) {
          markdown += `   - Made by: ${decision.madeBy}\n`;
        }
        markdown += `   - Impact: ${decision.impact.toUpperCase()}\n`;
        if (decision.context) {
          markdown += `   - Context: ${decision.context}\n`;
        }
        markdown += '\n';
      });
    }

    // Sentiment Analysis
    if (meeting.sentiment) {
      markdown += `## Sentiment Analysis\n\n`;
      markdown += `**Overall:** ${meeting.sentiment.overall.toUpperCase()} (${meeting.sentiment.score.toFixed(2)})\n\n`;

      if (meeting.sentiment.emotions) {
        markdown += `**Emotions:**\n`;
        markdown += `- Joy: ${((meeting.sentiment.emotions.joy ?? 0) * 100).toFixed(1)}%\n`;
        markdown += `- Frustration: ${((meeting.sentiment.emotions.frustration ?? 0) * 100).toFixed(1)}%\n`;
        markdown += `- Stress: ${((meeting.sentiment.emotions.stress ?? 0) * 100).toFixed(1)}%\n`;
        markdown += `- Engagement: ${((meeting.sentiment.emotions.engagement ?? 0) * 100).toFixed(1)}%\n\n`;
      }

      if (meeting.sentiment.burnoutIndicators) {
        markdown += `**Burnout Score:** ${meeting.sentiment.burnoutIndicators.score}/100\n\n`;

        if (meeting.sentiment.burnoutIndicators.factors.length > 0) {
          markdown += `**Concerning Factors:**\n`;
          meeting.sentiment.burnoutIndicators.factors.forEach((factor) => {
            markdown += `- ${factor}\n`;
          });
          markdown += '\n';
        }

        if (meeting.sentiment.burnoutIndicators.recommendations.length > 0) {
          markdown += `**Recommendations:**\n`;
          meeting.sentiment.burnoutIndicators.recommendations.forEach((rec) => {
            markdown += `- ${rec}\n`;
          });
          markdown += '\n';
        }
      }
    }

    // Transcript
    if (meeting.transcript?.fullText) {
      markdown += `## Transcript\n\n`;
      markdown += `${meeting.transcript.fullText}\n\n`;
    }

    return markdown;
  }

  /**
   * Generate CSV export of action items
   */
  exportActionItemsToCSV(meeting: IMeeting): string {
    if (!meeting.actionItems || meeting.actionItems.length === 0) {
      return 'No action items found';
    }

    const records = meeting.actionItems.map((item) => ({
      'Meeting Title': meeting.title,
      'Meeting Date': format(meeting.createdAt, 'yyyy-MM-dd'),
      'Action Item': item.description,
      'Assigned To': item.assignedTo || 'Unassigned',
      Priority: item.priority,
      Status: item.status,
      'Due Date': item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : 'No due date',
    }));

    return stringify(records, {
      header: true,
      columns: [
        'Meeting Title',
        'Meeting Date',
        'Action Item',
        'Assigned To',
        'Priority',
        'Status',
        'Due Date',
      ],
    });
  }

  /**
   * Generate CSV export of meetings
   */
  exportMeetingsToCSV(meetings: IMeeting[]): string {
    if (!meetings || meetings.length === 0) {
      return 'No meetings found';
    }

    const records = meetings.map((meeting) => ({
      Title: meeting.title,
      Date: format(meeting.createdAt, 'yyyy-MM-dd'),
      Status: meeting.status,
      Participants: meeting.participants?.length || 0,
      'Action Items': meeting.actionItems?.length || 0,
      Decisions: meeting.decisions?.length || 0,
      Sentiment: meeting.sentiment?.overall || 'N/A',
      'Burnout Score': meeting.sentiment?.burnoutIndicators?.score || 'N/A',
    }));

    return stringify(records, {
      header: true,
    });
  }
}
