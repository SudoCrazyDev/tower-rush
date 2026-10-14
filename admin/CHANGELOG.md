# Admin changelog

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
