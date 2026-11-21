-- Earlier versions of a regenerated reply are kept (syn-086); null = the messages in use.
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "archived_version" uuid;
