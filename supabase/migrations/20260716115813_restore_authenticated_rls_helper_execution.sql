-- SYRA-CONTRACT: docs/28-database-security-matrix.md
-- SYRA-ADR: none-additive
-- SYRA-CHANGE: additive
-- SYRA-PII: none
-- SYRA-RLS: S3/S6 restores authenticated execution of existing deny-by-default policy predicates
-- SYRA-IMMUTABLE: no table data or historical evidence is mutated
-- SYRA-SEED: none

revoke all on function private.user_has_resource_access(uuid, uuid) from public, anon;
grant execute on function private.user_has_resource_access(uuid, uuid) to authenticated;

revoke all on function private.can_read_assessment_assignment(uuid) from public, anon;
grant execute on function private.can_read_assessment_assignment(uuid) to authenticated;

revoke all on function private.can_manage_assessment_catalog() from public, anon;
grant execute on function private.can_manage_assessment_catalog() to authenticated;

revoke all on function private.can_read_attempt(uuid) from public, anon;
grant execute on function private.can_read_attempt(uuid) to authenticated;

revoke all on function private.can_read_question_version(uuid) from public, anon;
grant execute on function private.can_read_question_version(uuid) to authenticated;

revoke all on table
  public.assignment_catalog_projection,
  public.student_assignment_projection,
  public.grading_queue_projection,
  public.assignment_gradebook_projection,
  public.assignment_reporting_projection
from public, anon;

grant select on table
  public.assignment_catalog_projection,
  public.student_assignment_projection,
  public.grading_queue_projection,
  public.assignment_gradebook_projection,
  public.assignment_reporting_projection
to authenticated;

revoke all on table
  public.assignments,
  public.assignment_versions,
  public.assignment_windows,
  public.assignment_assignments,
  public.assignment_submissions,
  public.submission_versions,
  public.grading_queue_items,
  public.grading_assignments,
  public.gradebook_entries
from public, anon;

grant select on table
  public.assignments,
  public.assignment_versions,
  public.assignment_windows,
  public.assignment_assignments,
  public.assignment_submissions,
  public.submission_versions,
  public.grading_queue_items,
  public.grading_assignments,
  public.gradebook_entries
to authenticated;
