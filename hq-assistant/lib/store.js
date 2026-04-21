// lib/store.js
// Upstash Redis wrapper for todos + events

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TODOS_KEY = "hq:todos";
const EVENTS_KEY = "hq:events";

export async function getTodos() {
  const data = await kv.get(TODOS_KEY);
  return data || [];
}

export async function setTodos(todos) {
  await kv.set(TODOS_KEY, todos);
}

export async function getEvents() {
  const data = await kv.get(EVENTS_KEY);
  return data || [];
}

export async function setEvents(events) {
  await kv.set(EVENTS_KEY, events);
}

export async function getAll() {
  const [todos, events] = await Promise.all([getTodos(), getEvents()]);
  return { todos, events };
}
