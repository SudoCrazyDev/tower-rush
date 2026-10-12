# Admin changelog

## 1.1.0
- Players: the detail header shows the email, whether it's confirmed, and newsletter consent. Edit can set or clear the email (a new one starts unconfirmed). Search matches emails. Needs API 1.2.0.

## 1.0.1
- Fix: the config editor no longer flags `Chapter b2s5c3: the last wave needs a boss`; The Great Scale is bossless by design (`ChapterMechanics.noBoss`).

## 1.0.0
- First versioned release as its own app (manage.crownnkeep.com), split from the API Worker.
- Environment switcher (Production / Staging) with a red or amber bar; separate sign-in per environment.
- "Copy config to Production" on the Versions page when viewing Staging.
