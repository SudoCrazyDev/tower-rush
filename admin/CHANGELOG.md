# Admin changelog

## 1.5.0
- Leagues page: min wave, gain per wave, loss per wave and max loss for each league, and an invite-only (Society) switch with entry gold and gems, dues gold and gems and dues days. Economy page: the old trophy fields are gone. Needs API 1.6.0.

## 1.4.0
- Funding page: add, edit, order and archive goals (monthly ones for running costs); see pledges waiting for payment and mark them Received (with the GCash reference) or Drop them; log a donation by hand; move a donation to another goal or reject it; upload the GCash QR and set the account name, PHP per USD and the optional Ko-fi handle. Needs API 1.5.0.

## 1.3.0
- Marketing plan page: the 9-week social calendar (2026-10-19 to 2026-12-20) for the remaining Higgsfield credits, with still and clip prompts, copy buttons for TikTok, FB Reels, X, the FB feed and Discord. Each paid day shows its 12s reel with the hook and a PLAY FREE NOW end card (player plus download), a no-text copy, still and raw clips, stored as `mkt:` art rows (process-art skips them); all 45 reels are generated and hosted under assets `marketing/`.

## 1.2.0
- v2.7 rules: Units shows each unit's awakening (multipliers, ultimate and its text) and the level speed row; Playground and arena view use the max rank from Economy (5) and show the unit's own ultimate; Economy gains `levelSpeedBonus` and labels the generic awakening values. Needs API 1.3.0.

## 1.1.0
- Players: the detail header shows the email, whether it's confirmed, and newsletter consent. Edit can set or clear the email (a new one starts unconfirmed). Search matches emails. Needs API 1.2.0.
- Invites page (People): send an invitation email, see pending, used, expired and revoked invites with who used them, resend or revoke. Needs API 1.2.0.

## 1.0.1
- Fix: the config editor no longer flags `Chapter b2s5c3: the last wave needs a boss`; The Great Scale is bossless by design (`ChapterMechanics.noBoss`).

## 1.0.0
- First versioned release as its own app (manage.crownnkeep.com), split from the API Worker.
- Environment switcher (Production / Staging) with a red or amber bar; separate sign-in per environment.
- "Copy config to Production" on the Versions page when viewing Staging.
