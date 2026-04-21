// api/data.js
// GET  /api/data        → { todos, events }
// POST /api/data        → { todos?, events? } to replace arrays

import { getAll, setTodos, setEvents } from "../lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const data = await getAll();
    return res.json(data);
  }

  if (req.method === "POST") {
    const { todos, events } = req.body;
    if (todos) await setTodos(todos);
    if (events) await setEvents(events);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
