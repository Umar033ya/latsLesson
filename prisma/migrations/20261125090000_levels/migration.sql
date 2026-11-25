-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "startLevels" JSONB NOT NULL DEFAULT '{}';

-- Official levels: one per topic with enough questions (up to four), then a final level with the whole subject.
WITH topics AS (
  SELECT t."subjectId", t.id, row_number() OVER (PARTITION BY t."subjectId" ORDER BY t.name) AS n
  FROM "Topic" t
  WHERE t."isActive" AND (SELECT count(*) FROM "Question" q WHERE q."topicId" = t.id AND q."organizationId" IS NULL AND q."status" = 'PUBLISHED') >= 4
),
steps AS (
  SELECT "subjectId", n::int AS n, jsonb_build_array(id) AS topic_ids FROM topics WHERE n <= 4
  UNION ALL
  SELECT "subjectId", (max(n) + 1)::int, jsonb_agg(id) FROM topics WHERE n <= 4 GROUP BY "subjectId"
),
names(slug, ru, uz) AS (
  VALUES ('mathematics', 'Математика', 'Matematika'), ('english', 'Английский язык', 'Ingliz tili'), ('biology', 'Биология', 'Biologiya'), ('physics', 'Физика', 'Fizika'), ('history', 'История', 'Tarix')
)
INSERT INTO "Campaign" ("id", "title", "status", "translations", "config", "publishedAt", "updatedAt")
SELECT gen_random_uuid(), s.name || ', level ' || st.n, 'PUBLISHED',
  jsonb_build_object('ru', jsonb_build_object('title', COALESCE(n.ru, s.name) || ', уровень ' || st.n), 'uz', jsonb_build_object('title', COALESCE(n.uz, s.name) || ', ' || st.n || '-daraja')),
  jsonb_build_object(
    'level', jsonb_build_object('subjectId', s.id, 'number', st.n),
    'sections', '["classroom", "library", "biology", "lobby"]'::jsonb,
    'source', jsonb_build_object('subjectIds', jsonb_build_array(s.id), 'topicIds', st.topic_ids),
    'difficulty', CASE WHEN st.n <= 2 THEN 'EASY' WHEN st.n <= 4 THEN 'MEDIUM' ELSE 'HARD' END,
    'gameplay', jsonb_build_object('sessionMinutes', LEAST(15 + (st.n - 1) * 5, 30))
  ),
  now(), now()
FROM steps st
JOIN "Subject" s ON s.id = st."subjectId" AND s."isActive"
LEFT JOIN names n ON n.slug = s.slug
WHERE NOT EXISTS (SELECT 1 FROM "Campaign" c WHERE c."organizationId" IS NULL AND c."config" #>> '{level,subjectId}' = s.id::text);
