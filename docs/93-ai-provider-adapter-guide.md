# AI Provider Adapter Guide

## Contract

Adapters implement `AiProviderAdapter` for chat, completion, summarization, classification, translation, structured output, recommendation, and content assistance. The adapter accepts only `NormalizedAiRequest` and returns only `NormalizedAiResponse`; provider-native objects stay inside the adapter.

Implemented adapters:

- OpenAI Responses API with `store: false`.
- Anthropic Messages API.
- Gemini `generateContent` API with the key in a request header, never the URL.

The registry instantiates an adapter only when its provider is enabled and has a server credential. Official APIs are called through the shared injected HTTP transport, so tests use deterministic mock responses and make no network requests.

## Boundary

`AiProviderExecutionService` is the only approved invocation path. It resolves policy and route, reserves budget, redacts input, calls the registry, validates output, reconciles cost, and writes evidence. Product features call `executeAiCapability`; they do not import adapters.

## Errors

Adapters classify authentication, forbidden, invalid request, timeout, rate limit, overload, content policy, and transient failures. Raw response bodies and provider messages never leave the adapter. Provider request identifiers are hashed before evidence persistence.

## Adding Support

An adapter change requires contract tests for request mapping, response normalization, abort handling, structured output, usage metadata, and safe errors. New providers require a separate approved implementation wave and must not be added by configuration alone.
