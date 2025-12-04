export const DECISIONS_PROMPT = `
You are an expert meeting assistant. Analyze the following meeting transcript and extract ALL key decisions made.

TRANSCRIPT:
{transcript}

Extract decisions following these rules:
1. Look for agreements, approvals, choices, and resolutions
2. Identify who made the decision when mentioned
3. Determine impact level (high/medium/low) based on scope
4. Include relevant context explaining why the decision was made
5. Ignore minor procedural decisions unless significant

Return a JSON array with this exact structure:
[
  {
    "description": "Clear description of what was decided",
    "madeBy": "Decision maker's name or null if not clear",
    "impact": "high" | "medium" | "low",
    "context": "Why this decision was made or relevant background"
  }
]

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanation
- If no decisions found, return empty array: []
- Impact = high: affects product/company strategy, multiple teams
- Impact = medium: affects single team or project significantly
- Impact = low: minor process or procedural decisions
`.trim();