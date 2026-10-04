-- Best wave per arena (profile.arenaBest), filled in from each player's past battles.
UPDATE users
SET profile = json_set(profile, '$.arenaBest', json((
      SELECT json_group_object(arena, best)
      FROM (SELECT arena, MAX(wave) AS best FROM battles WHERE user_id = users.id AND wave IS NOT NULL GROUP BY arena)
    ))),
    rev = rev + 1
WHERE json_extract(profile, '$.arenaBest') IS NULL;
