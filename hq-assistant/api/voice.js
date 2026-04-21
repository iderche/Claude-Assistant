// api/voice.js
// Called by iOS Shortcut
// POST { text: string } with header x-api-key
// Returns { reply: string } — Shortcut reads this aloud via Siri TTS

import Anthropic from "@anthropic-ai/sdk";
import { getAll, setTodos, setEvents } from "../lib/store.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Simple API key auth for Shortcut
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.SHORTCUT_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text" });

  const { todos, events } = await getAll();
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Toronto"
  });
  const time = now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });

  const systemPrompt = `You are HQ — a sharp voice assistant. Current date: ${today}, time: ${time}.

TODOS: ${JSON.stringify(todos)}
EVENTS: ${JSON.stringify(events)}

The user is speaking to you hands-free. Respond in natural spoken language — short, no lists, no markdown.
If they ask to add/change something, do it and confirm briefly.

Respond ONLY with JSON:
{
  "reply": "what to say out loud (2-3 sentences max)",
  "todos": null or updated array,
  "events": null or updated array
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content.map(b => b.text || "").join("");
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { reply: raw, todos: null, events: null };
    }

    if (parsed.todos) await setTodos(parsed.todos);
    if (parsed.events) await setEvents(parsed.events);

    // Return plain text for Siri to speak
    res.json({ reply: parsed.reply || "Done." });
  } catch (err) {
    console.error(err);
    res.json({ reply: "Sorry, I had a connection issue. Try again." });
  }
}
