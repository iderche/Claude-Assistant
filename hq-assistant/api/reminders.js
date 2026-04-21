// api/reminders.js
// Called by Vercel Cron: 8am, 12pm, 5pm Montreal time
// Sends push notification to your iPhone via ntfy.sh

import Anthropic from "@anthropic-ai/sdk";
import { getAll } from "../lib/store.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // Only allow Vercel Cron or your own calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { todos, events } = await getAll();
  const now = new Date();
  const hour = parseInt(now.toLocaleTimeString("en-CA", { hour: "2-digit", hour12: false, timeZone: "America/Toronto" }));

  let briefingType = "midday";
  if (hour <= 9) briefingType = "morning";
  else if (hour >= 16) briefingType = "evening";

  const today = now.toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto"
  });
  const todayStr = now.toISOString().split("T")[0];

  const prompt = `Generate a ${briefingType} briefing for ${today}.

TODOS: ${JSON.stringify(todos)}
EVENTS: ${JSON.stringify(events)}
TODAY'S DATE STRING: ${todayStr}

Rules:
- Morning: What's on the agenda today + top 2 urgent tasks. Max 3 sentences.
- Midday: Quick pulse — what's pending, any events this afternoon. Max 2 sentences.
- Evening: What got done, what's deferred to tomorrow. Max 2 sentences.

Be direct, no fluff. Sound like a sharp chief of staff, not a chatbot.
Return ONLY JSON: { "title": "short notification title", "body": "the briefing text" }`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content.map(b => b.text || "").join("");
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { title: "HQ Briefing", body: raw };
    }

    // Send push via ntfy.sh
    const ntfyTopic = process.env.NTFY_TOPIC; // e.g. "hq-yourname-2024"
    if (ntfyTopic) {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: "POST",
        headers: {
          "Title": parsed.title,
          "Priority": briefingType === "morning" ? "high" : "default",
          "Tags": briefingType === "morning" ? "sunrise" : briefingType === "evening" ? "moon" : "sun_with_face",
          "Content-Type": "text/plain",
        },
        body: parsed.body,
      });
    }

    res.json({ ok: true, briefing: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
