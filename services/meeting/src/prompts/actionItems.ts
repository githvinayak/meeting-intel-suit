export const ACTION_ITEMS_PROMPT = `
You are an expert meeting assistant. Analyze the following meeting transcript and extract ALL action items.

TRANSCRIPT:
{transcript}

Extract action items following these rules:
1. Look for tasks, assignments, commitments, and follow-ups
2. Identify who is responsible (assignee) when mentioned
3. Determine priority based on language urgency (high/medium/low)
4. Extract or infer due dates when mentioned
5. Include context in the description

Return a JSON array with this exact structure:
[
  {
    "description": "Clear, actionable task description",
    "assignedTo": "Person's name or null if not mentioned",
    "priority": "high" | "medium" | "low",
    "dueDate": "YYYY-MM-DD or null if not mentioned"
  }
]

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanation
- If no action items found, return empty array: []
- Be thorough - don't miss implicit action items
- Priority indicators: "urgent", "ASAP", "critical" = high; "when you can", "eventually" = low
`.trim();