import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE team_entry_audit
    DROP CONSTRAINT IF EXISTS team_entry_audit_box_status_check
  `.execute(db);

  await sql`
    ALTER TABLE team_entry_audit
    ADD CONSTRAINT team_entry_audit_box_status_check
    CHECK (box_status in ('selected','eliminated','available','reset','swapped'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE team_entry_audit
    DROP CONSTRAINT IF EXISTS team_entry_audit_box_status_check
  `.execute(db);

  await sql`
    ALTER TABLE team_entry_audit
    ADD CONSTRAINT team_entry_audit_box_status_check
    CHECK (box_status in ('selected','eliminated','available','reset'))
  `.execute(db);
}