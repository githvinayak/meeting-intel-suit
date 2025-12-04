export const SENTIMENT_PROMPT = `
You are an expert in organizational psychology and team dynamics. Analyze the following meeting transcript for sentiment, emotions, and burnout indicators.

TRANSCRIPT:
{transcript}

PARTICIPANTS:
{participants}

Perform a comprehensive analysis and return JSON with this EXACT structure:

{
  "overall": "positive" | "neutral" | "negative",
  "score": -1.0 to 1.0,
  "emotions": {
    "joy": 0.0 to 1.0,
    "frustration": 0.0 to 1.0,
    "stress": 0.0 to 1.0,
    "engagement": 0.0 to 1.0
  },
  "burnoutIndicators": {
    "score": 0 to 100,
    "factors": ["array of concerning patterns found"],
    "recommendations": ["array of actionable suggestions for managers"]
  },
  "participants": [
    {
      "name": "Participant name",
      "sentimentScore": -1.0 to 1.0,
      "engagementLevel": 0.0 to 1.0,
      "concerns": ["array of specific concerns for this person or empty array"]
    }
  ]
}

ANALYSIS GUIDELINES:

**Overall Sentiment:**
- positive: Optimistic, collaborative, constructive tone
- neutral: Factual, balanced, neither positive nor negative
- negative: Pessimistic, tense, conflict present

**Emotion Scores (0-1):**
- joy: Enthusiasm, humor, celebration, satisfaction
- frustration: Annoyance, complaints, repeated issues
- stress: Pressure, anxiety, overwhelm, tight deadlines
- engagement: Active participation, interest, contribution

**Burnout Score (0-100):**
- 0-30: Healthy, sustainable pace
- 31-60: Some stress signals, monitor closely
- 61-80: High risk, intervention recommended
- 81-100: Critical, immediate action needed

**Burnout Factors to Detect:**
- Repeated expressions of being overwhelmed or exhausted
- Complaints about workload or impossible deadlines
- Mentions of working late/weekends consistently
- Lack of enthusiasm or disengagement
- Cynicism or negative attitudes toward work
- Expressed concerns about work-life balance
- Signs of conflict avoidance or withdrawal

**Per-Participant Analysis:**
- Analyze each participant's tone, language patterns, participation level
- Flag concerns like low engagement, high stress, or withdrawal
- Consider speaking time and contribution quality

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanation
- All scores must be within specified ranges
- Be objective and evidence-based
- If transcript is too short for analysis, return neutral values with empty arrays
`.trim();