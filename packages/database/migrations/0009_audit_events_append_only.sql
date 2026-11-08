-- Audit rows are facts: they may be inserted (and deleted by retention), never changed.
CREATE OR REPLACE FUNCTION audit_events_reject_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'audit_events is append-only (UPDATE of % rejected)', OLD.id
		USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_events_append_only ON "audit_events";--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
	BEFORE UPDATE ON "audit_events"
	FOR EACH ROW EXECUTE FUNCTION audit_events_reject_update();
