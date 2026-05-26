-- Migrate existing members.team strings to team_members records.
-- Members with a team string that does NOT match an existing team
-- (orphans) are skipped. A NOTICE is raised if orphans exist.
-- members.team column stays in place for backwards compatibility.

INSERT INTO team_members (team_id, member_id, joined_at, left_at)
SELECT
  t.id AS team_id,
  m.id AS member_id,
  m.joined_at,
  NULL AS left_at
FROM members m
INNER JOIN teams t ON t.name = m.team
WHERE m.team IS NOT NULL
ON CONFLICT (team_id, member_id, left_at) DO NOTHING;

DO $$
DECLARE
  orphan_count INT;
  migrated_count INT;
BEGIN
  SELECT COUNT(*)
  INTO orphan_count
  FROM members m
  WHERE m.team IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.name = m.team);

  SELECT COUNT(*) INTO migrated_count FROM team_members;

  RAISE NOTICE 'team_members migration: % records created, % orphan member(s) skipped', migrated_count, orphan_count;
END $$;
