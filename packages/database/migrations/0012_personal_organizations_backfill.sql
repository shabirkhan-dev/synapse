-- Every existing user gets a personal organization with the same id, owned by them, so rows keyed
-- by owner_id = user id already belong to it. Safe to run twice.
INSERT INTO "organizations" ("id", "name", "kind")
SELECT "id", 'Personal', 'personal' FROM "users"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "organization_members" ("organization_id", "user_id", "role")
SELECT "id", "id", 'owner' FROM "users"
ON CONFLICT ("organization_id", "user_id") DO NOTHING;
