-- Player email: required for new accounts (not guests), used for password recovery.
-- email_verified_at is set once the player types a code we mailed them.
-- marketing_opt_in records consent for future newsletters (unchecked by default).
ALTER TABLE users ADD COLUMN email TEXT COLLATE NOCASE;
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN marketing_opt_in INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_email ON users(email) WHERE email IS NOT NULL;

-- One live 6-digit code per player and purpose ('verify' = confirm the email,
-- 'reset' = forgot password). Only a hash of the code is stored.
CREATE TABLE email_codes (
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  code_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, purpose)
);
