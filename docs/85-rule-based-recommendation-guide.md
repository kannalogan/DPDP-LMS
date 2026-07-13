# Rule-Based Recommendation Guide

Recommendations are deterministic and use only authorized search documents, current-user recent activity, organization popularity, entity type, and document recency.

Supported reasons include continue learning, pending assignment, upcoming assessment, recommended certificate, popular learning, frequently viewed, recently updated, role-based, organization, and notification-driven recommendations.

`refresh_recommendations` first expires stale results, then upserts a bounded current-user projection. It never widens the search audience. Opening, dismissing, or completing a recommendation updates its projection and appends a dashboard event for reporting.

Administrators may configure named rules and priorities. Rules are explainable JSON conditions; this wave contains no model inference, embeddings, behavioral profiling service, or external provider.
