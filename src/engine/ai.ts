import type { Task, Category, ChatMessage, TaskAction } from '@/types';

const SYSTEM_PROMPT_TEMPLATE = `You are TaskMind, an intelligent task management assistant. You help the user organize their time, priorities, and tasks through natural conversation.

CURRENT DATE/TIME: {{datetime}}

CURRENT TASK LIST:
{{tasks}}

CURRENT CATEGORIES:
{{categories}}

YOUR RESPONSIBILITIES:
1. Extract tasks, deadlines, priorities, effort estimates, and categories from natural language
2. When the user mentions work to do, create structured tasks automatically
3. Suggest priorities and effort estimates when not explicitly stated
4. Offer to break down large tasks into subtasks
5. Answer "what should I do next?" by analyzing priorities, deadlines, effort, and energy
6. Provide daily briefings when asked
7. Nudge about overdue, stale, or at-risk tasks
8. Allow conversational editing ("push X to Monday", "mark Y done", "change priority of Z")
9. Manage categories — auto-assign and allow user overrides
10. Support snooze/defer requests

RESPONSE FORMAT:
Always respond with valid JSON containing exactly two fields:
{
  "message": "Your natural language response to the user (friendly, concise, helpful)",
  "actions": [
    {
      "type": "create",
      "data": {
        "title": "...",
        "priority": "medium",
        "category": "Work",
        "tags": [],
        "deadline": "2025-03-28",
        "deadlineType": "hard",
        "effort": 120,
        "energyType": "deep_focus",
        "notes": ""
      }
    }
  ]
}

ACTION TYPES:
- "create": Create a new task. Include all relevant fields in "data".
- "update": Modify an existing task. Include "taskId" and changed fields in "data".
- "delete": Remove a task. Include "taskId".
- "complete": Mark task done. Include "taskId". Optionally include "data.actualEffort" if user mentions how long it took.
- "defer": Push a task to a later date. Include "taskId" and "data.deadline".
- "snooze": Hide task until a date. Include "taskId" and "data.snoozedUntil".
- "decompose": Break a task into subtasks. Include "taskId" and "subtasks" array.
- "create_category": Create a new category. Include "data.name", "data.color", "data.icon".

If no action is needed (just conversation), return an empty actions array.

PRIORITIZATION LOGIC (for "what next?" queries):
Score = (deadline_urgency * 3) + (priority_weight * 2) + (staleness * 1) + (energy_match * 1)
- deadline_urgency: overdue=10, today=8, tomorrow=6, this_week=4, later=1, none=2
- priority_weight: critical=10, high=7, medium=4, low=1
- staleness: days since creation with no progress, capped at 10
- energy_match: +3 if task energy type matches user's stated energy level
- Skip tasks with status "done", "snoozed", or blocked by incomplete dependencies

RULES:
- Never invent tasks the user didn't mention or imply
- If ambiguous, ask a clarifying question instead of guessing
- Keep messages concise — no walls of text
- Use the user's language and tone
- When creating tasks, always suggest a priority and effort estimate even if not stated
- Default category is "Inbox" if unclear
- Dates should be ISO format (YYYY-MM-DD)
- If the user seems overwhelmed, suggest focusing on just 1-3 tasks
- Respond only with the JSON object, no markdown fences, no preamble`;

function buildSystemPrompt(tasks: Task[], categories: Category[]): string {
  return SYSTEM_PROMPT_TEMPLATE
    .replace('{{datetime}}', new Date().toISOString())
    .replace('{{tasks}}', JSON.stringify(tasks, null, 2))
    .replace('{{categories}}', JSON.stringify(categories, null, 2));
}

function buildMessages(chatHistory: ChatMessage[]): Array<{ role: string; content: string }> {
  // Send last 10 messages, stripping actions from historical messages
  return chatHistory.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

export interface AIResponse {
  message: string;
  actions: TaskAction[];
}

export async function callAI(
  apiKey: string,
  tasks: Task[],
  categories: Category[],
  chatHistory: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  const system = buildSystemPrompt(tasks, categories);
  const messages = [
    ...buildMessages(chatHistory),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content.map((block: { text?: string }) => block.text || '').join('');
  return parseAIResponse(text);
}

export function parseAIResponse(text: string): AIResponse {
  // Strip markdown fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      message: parsed.message ?? '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    // If we can't parse JSON, treat the entire response as a message with no actions
    return {
      message: text.trim(),
      actions: [],
    };
  }
}
