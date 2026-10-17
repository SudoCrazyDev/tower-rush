-- The running-costs goal is shown to players as "Game Servers", without naming the host.
-- It stays the only monthly (recurring) goal; content goals such as VFX are one-time.
UPDATE funding_goals
SET title = 'Game Servers',
    description = 'Keeps the game, PvP battles and your account online for everyone. Refills every month.',
    monthly = 1,
    updated_at = unixepoch() * 1000
WHERE title = 'Cloudflare servers';
