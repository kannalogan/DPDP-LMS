# ADR-012: Enterprise Reporting Platform

Status: accepted

The reporting domain is an additive warehouse-facing layer. It stores organization-scoped definitions, execution evidence, snapshots, metrics, KPIs and operational statistics. Existing Student, Mentor, Admin, Learning, Assessment, Certificate, Course Authoring and Question Authoring runtime tables remain unchanged.

All reporting tables use forced RLS. Management writes are controlled by server-side RPCs and the existing organization/admin authorization model. Projection views are read-only and never public. Evidence tables are append-only.
