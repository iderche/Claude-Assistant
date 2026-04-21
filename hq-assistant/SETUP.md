# HQ Assistant — Setup Guide

## What you get
- Web app (mobile-first, add to iPhone home screen)
- Claude AI chat with voice in + voice out (TTS)
- 3x daily push notifications (morning / midday / evening briefings)
- iPhone Calendar subscription (auto-syncs events)
- iOS Shortcut: say "Hey Siri, HQ" → hands-free AI conversation

---

## Step 1 — Deploy to Vercel

### Prerequisites
- Node.js installed (`node -v`)
- Vercel account at vercel.com (free)

```bash
npm install -g vercel
cd hq-assistant
npm install
vercel login
vercel --prod
```

Note your deployment URL: `https://hq-xxxx.vercel.app`

---

## Step 2 — Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Key | Value | Notes |
|-----|-------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Claude API key |
| `SHORTCUT_API_KEY` | any random string | e.g. `hq-montreal-2024-abc` — you pick this |
| `CRON_SECRET` | any random string | e.g. `cron-secret-xyz` — for securing cron endpoint |
| `NTFY_TOPIC` | unique topic name | e.g. `hq-yourname-84729` — must be unique on ntfy.sh |
| `UPSTASH_REDIS_REST_URL` | (auto-filled) | After adding Upstash Redis below |
| `UPSTASH_REDIS_REST_TOKEN` | (auto-filled) | After adding Upstash Redis below |

### Add Upstash Redis (database)
1. Vercel Dashboard → Storage → Marketplace → **Upstash** → Create → **Redis**
2. Connect to your project → env vars auto-populate (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)

Redeploy after adding all vars:
```bash
vercel --prod
```

---

## Step 3 — iPhone: Install ntfy app

1. App Store → install **ntfy** (free, by binwiederhier)
2. Open ntfy → Add subscription → Topic: `hq-yourname-84729` (same as your NTFY_TOPIC)
3. Allow notifications

You'll now get morning / midday / evening AI briefings automatically.

---

## Step 4 — iPhone Calendar Subscription

1. iPhone → Settings → Calendar → Accounts → Add Account → Other
2. Add Subscribed Calendar
3. URL: `https://hq-xxxx.vercel.app/api/calendar.ics?key=YOUR_SHORTCUT_API_KEY`
4. Tap Next → Save
5. Set refresh interval: Every Hour

Your HQ events now appear in the native iPhone Calendar.

---

## Step 5 — iOS Shortcut ("Hey Siri, HQ")

### Create the Shortcut:
1. Open **Shortcuts** app → tap **+** (new shortcut)
2. Name it: **HQ**
3. Add these actions in order:

**Action 1: Dictate Text**
- Action: "Dictate Text"
- Language: English

**Action 2: Get Contents of URL**
- URL: `https://hq-xxxx.vercel.app/api/voice`
- Method: POST
- Headers: 
  - `x-api-key` → `YOUR_SHORTCUT_API_KEY`
  - `Content-Type` → `application/json`
- Request Body: JSON
  - Key: `text` | Value: Dictated Text (variable from Action 1)

**Action 3: Get Value for Key**
- Dictionary: Contents of URL (from Action 2)
- Key: `reply`

**Action 4: Speak Text**
- Text: Value (from Action 3)

### Enable Siri:
- Shortcut settings → Add to Siri → record "Hey HQ" or just use "Hey Siri, HQ"

---

## Step 6 — Add to iPhone Home Screen (PWA)

1. Open `https://hq-xxxx.vercel.app` in Safari
2. Share button → Add to Home Screen
3. Name: HQ → Add

Opens full-screen, no browser chrome.

---

## Reminder Schedule (UTC times in vercel.json)

| Cron | Montreal time | Briefing |
|------|--------------|---------|
| 0 8 * * * | 8am EST | Morning: today's agenda + urgent tasks |
| 0 12 * * * | 12pm EST | Midday: pulse check |
| 0 17 * * * | 5pm EST | Evening: EOD wrap |

Adjust times in `vercel.json` → redeploy if needed.
Note: Vercel cron runs in UTC. EST = UTC-5, EDT = UTC-4.
For EDT (summer): use 12, 16, 21. For EST (winter): use 13, 17, 22.

---

## File Structure

```
hq-assistant/
├── api/
│   ├── chat.js          ← main AI chat endpoint
│   ├── voice.js         ← iOS Shortcut endpoint
│   ├── reminders.js     ← cron briefings → ntfy push
│   ├── calendar.ics.js  ← iPhone calendar feed
│   └── data.js          ← todos/events REST
├── lib/
│   └── store.js         ← Vercel KV helpers
├── public/
│   ├── index.html       ← web app (PWA)
│   └── manifest.json    ← PWA manifest
├── package.json
└── vercel.json          ← cron schedule
```

---

## Testing

```bash
# Test chat
curl -X POST https://hq-xxxx.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What tasks do I have?","history":[]}'

# Test voice
curl -X POST https://hq-xxxx.vercel.app/api/voice \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SHORTCUT_API_KEY" \
  -d '{"text":"What is on my agenda today?"}'

# Test reminders manually
curl -X GET https://hq-xxxx.vercel.app/api/reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test calendar feed
open "https://hq-xxxx.vercel.app/api/calendar.ics?key=YOUR_SHORTCUT_API_KEY"
```
