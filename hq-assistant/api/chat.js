// api/chat.js
// POST { message: string, history: [{role, content}] }
// Returns { reply: string, todos?, events? }

import Anthropic from "@anthropic-ai/sdk";
import { getAll, setTodos, setEvents } from "../lib/store.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "No message" });

  const { todos, events } = await getAll();
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Toronto"
  });

  const systemPrompt = `You are HQ — a sharp, concise personal executive assistant for a busy entrepreneur/CTO/CEO based in Montreal.
Today is ${today}.

CURRENT TODOS:
${JSON.stringify(todos, null, 2)}

CURRENT EVENTS/AGENDA:
${JSON.stringify(events, null, 2)}

You can add, update, complete, delete todos and events based on the user's natural language requests.
Be brief. Confirm actions in one sentence. Don't list everything back unless asked.

ALWAYS respond with valid JSON only — no markdown, no preamble:
{
  "reply": "your spoken response (concise, direct, no fluff)",
  "todos": [...full updated array, or null if unchanged],
  "events": [...full updated array, or null if unchanged]
}

Todo shape: { "id": "uid", "text": "...", "done": false, "priority": "high|medium|low", "tags": [], "createdAt": "ISO", "dueDate": "YYYY-MM-DD or null" }
Event shape: { "id": "uid", "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM or null", "duration": "e.g. 1h or null", "notes": "...", "type": "meeting|deadline|personal|other" }

Generate IDs as random 8-char alphanumeric strings for new items.
For dates, interpret relative terms (tomorrow, next Monday, etc.) based on today's date.`;

  const messages = [
    ...history.slice(-20), // keep last 20 turns for context
    { role: "user", content: message }
  ];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    const raw = response.content.map(b => b.text || "").join("");
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { reply: raw, todos: null, events: null };
    }

    // Persist any changes
    if (parsed.todos) await setTodos(parsed.todos);
    if (parsed.events) await setEvents(parsed.events);

    res.json({
      reply: parsed.reply,
      todos: parsed.todos,
      events: parsed.events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error", detail: err.message });
  }
}
