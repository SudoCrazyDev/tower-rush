-- Invitations sent from the admin panel. With INVITE_ONLY set (staging), an invite is the
-- only way to create an account. The link in the email carries a random token; only its
-- hash is stored. An invite is pending until used, revoked or past expires_at.
CREATE TABLE invites (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  user_id INTEGER,
  revoked_at INTEGER
);
CREATE INDEX invites_email ON invites(email);
