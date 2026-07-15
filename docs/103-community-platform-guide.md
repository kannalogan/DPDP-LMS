# Community Platform Guide

`features/community` provides typed repositories, DTO mapping, schemas, actions, authorization, selectors, workflows, and reusable components. Server repositories use the authenticated Supabase client and active organization context. Empty queries return typed empty collections; they never substitute demonstration rows.

Forum content supports nested replies, Markdown, code-block-safe rendering, mentions and hashtag metadata, reactions, bookmarks, solved answers, locks, pins, reports, and immutable revisions. Messaging supports direct and group channels, parent messages, unread calculation, read evidence, reactions, attachment metadata, archive state, and user blocks.

All mutations call the Prompt #027 RPC inventory. Routes never write directly to tables. Moderation decisions append communication evidence and cannot rewrite revision or attendance history.
