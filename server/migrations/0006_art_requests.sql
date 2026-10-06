-- Admin "Art requests": the generated-image link, status and notes for each entry of the
-- art wish list in shared/art-requests.ts (the list and its prompts live in code).
CREATE TABLE art_requests (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  notes TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by INTEGER
);
