# Enterprise Search Architecture Guide

## Query path

Authorized source events call `index_document` with a source reference, source version, content hash, safe title/summary, route, and the narrowest valid audience. PostgreSQL generates weighted full-text vectors and maintains trigram, tenant, type, course, tag, recency, and popularity indexes.

`search_content` expands exact organization/global synonyms, applies full-text and trigram candidates, checks audience authorization, applies structured filters, explicit boost rules, deterministic ranking, and bounded pagination. DTO mapping returns only the search document ID, source reference, safe snippet, route, labels, rank, and dates.

## Index sources

The source catalog covers learning, courses, modules, lessons, resources, learning paths, assignments, rubrics, gradebooks, assessments, questions, certificates, announcements, notifications, reports, governance controls, policies, evidence, findings, risks, privacy requests, organizations, and public profile metadata. Search stores references and minimized derivative text, not source records.

## Ranking

Ranking combines PostgreSQL full-text rank, title similarity, explicit bounded boost rules, popularity, and stable tie-breakers. Users can sort by relevance, recency, popularity, or title. Hidden attributes, roles, PII, and inaccessible records never influence the candidate set.

## Operations

Search administrators manage index versions, synonyms, boost rules, and recommendation rules through controlled RPCs. Search activity events are immutable. Index versions are immutable and rebuilding creates a new version. No business seed data is installed.
