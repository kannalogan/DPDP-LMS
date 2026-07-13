# Assignment and Grading Migration Notes

Migration 20260706001000_assignment_grading_platform.sql is additive. It creates the missing canonical assignment/submission runtime and supporting authoring, delivery, grading, feedback, resubmission, gradebook and evidence entities. Existing assessment and rubric tables are not recreated or modified.

The migration adds five tenant-safe projections, controlled RPCs, forced RLS, private storage policies and immutable evidence triggers. It contains deployment permission registry rows only and no tenant, learner, assignment or business seed data.
