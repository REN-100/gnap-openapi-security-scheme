# GNAP OpenAPI Security Scheme (`x-gnap`)

> A vendor extension and formal proposal to add GNAP (RFC 9635) as a security scheme type in the OpenAPI Specification, enabling automated SDK generation for Open Payments and other GNAP-protected APIs.

[![ShujaaPay](https://img.shields.io/badge/ShujaaPay-GNAP%20Stack-blueviolet)](https://www.shujaapay.me)
[![npm](https://img.shields.io/npm/v/@shujaapay/gnap-openapi-security-scheme)](https://www.npmjs.com/package/@shujaapay/gnap-openapi-security-scheme)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-blue.svg)](https://spec.openapis.org/oas/v3.1.0)
[![RFC 9635](https://img.shields.io/badge/RFC-9635-orange.svg)](https://www.rfc-editor.org/rfc/rfc9635)
[![CI](https://github.com/REN-100/gnap-openapi-security-scheme/actions/workflows/ci.yml/badge.svg)](https://github.com/REN-100/gnap-openapi-security-scheme/actions)

## Problem Statement

The OpenAPI Specification (OAS 3.1) supports five security scheme types: `apiKey`, `http`, `mutualTLS`, `oauth2`, and `openIdConnect`. **GNAP (Grant Negotiation and Authorization Protocol, RFC 9635) is not among them.**

This means that APIs using GNAP for authorization - including [Open Payments](https://openpayments.dev), the payment initiation standard built on the Interledger Protocol - cannot express their authentication requirements in OpenAPI documents. When developers use SDK generators like [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/), [OpenAPI Generator](https://openapi-generator.tech/), or [Swagger Codegen](https://swagger.io/tools/swagger-codegen/), the GNAP authentication layer is silently dropped.

**The result:** Every Open Payments integration requires developers to hand-build GNAP flows from scratch - reading RFCs, implementing token lifecycle management, constructing HTTP Message Signature headers, and handling grant continuation state machines.

## Solution

This project delivers:

1. **`x-gnap` Vendor Extension** - An immediately usable extension for OAS 3.1 that describes GNAP security requirements in a machine-readable format.
2. **JSON Schema** - A formal schema definition for the `x-gnap` extension, enabling tooling validation.
3. **Annotated Open Payments Spec** - The official Open Payments OpenAPI document, annotated with the `x-gnap` extension.
4. **OAS Proposal** - A formal proposal to the OpenAPI Technical Steering Committee for native GNAP support.

## x-gnap Extension Structure

```yaml
components:
  securitySchemes:
    gnap:
      type: apiKey  # placeholder for OAS compatibility
      in: header
      name: Authorization
      x-gnap:
        grant_endpoint: "https://auth.example.com/"
        token_formats:
          - bearer
          - pop
        key_proofs:
          - method: httpsig
            alg:
              - ed25519
              - ecdsa-p256-sha256
          - method: mtls
          - method: jwsd
        interaction:
          start:
            - redirect
            - user_code
          finish:
            - redirect
            - push
        access_rights:
          - type: incoming-payment
            actions: [create, read, read-all, list, complete]
          - type: outgoing-payment
            actions: [create, read, read-all, list]
          - type: quote
            actions: [create, read, read-all]
        continuation:
          supported: true
          poll: true
          wait: true
```

## Project Structure

```
gnap-openapi-security-scheme/
  schemas/
    x-gnap-extension.json       # JSON Schema for the x-gnap extension
  specs/
    open-payments-gnap.yaml     # Annotated Open Payments OAS document
  examples/
    basic-usage.yaml            # Minimal example
    full-featured.yaml          # Complete example with all options
  docs/
    SPECIFICATION.md            # Detailed specification document
    OAS-PROPOSAL.md             # Draft proposal for OAS TSC
    GNAP-PRIMER.md              # Quick intro to GNAP for API designers
  tests/
    validate-schema.js          # Schema validation tests (25 tests)
  .github/workflows/
    ci.yml                      # CI: schema validation on Node 18/20/22
  package.json                  # Node.js project with ajv validation
  LICENSE
  README.md
```

## Quick Start

### 1. Add `x-gnap` to your OpenAPI document

```yaml
openapi: "3.1.0"
info:
  title: My GNAP-Protected API
  version: "1.0.0"

components:
  securitySchemes:
    gnap_auth:
      type: apiKey
      in: header
      name: Authorization
      x-gnap:
        grant_endpoint: "https://auth.example.com/"
        key_proofs:
          - method: httpsig
            alg: [ed25519]
        token_formats: [bearer]

security:
  - gnap_auth: []
```

### 2. Validate your extension

```bash
npm install ajv
node tests/validate-schema.js your-api.yaml
```

### 3. Generate an SDK with GNAP support

```bash
# Using Kiota with the GNAP authentication provider
kiota generate -l typescript \
  -d your-api.yaml \
  -o ./sdk \
  --auth-provider @shujaapay/kiota-gnap-provider
```

## GNAP Concepts Mapped to OpenAPI

| GNAP Concept | x-gnap Field | Description |
|---|---|---|
| Grant Endpoint | `grant_endpoint` | URL where clients initiate grant requests |
| Key Proofs | `key_proofs` | How clients prove key possession (httpsig, mtls, jwsd) |
| Interaction | `interaction` | How the resource owner interacts (redirect, user_code) |
| Access Rights | `access_rights` | Fine-grained resource permissions with wallet address scoping |
| Token Format | `token_formats` | Bearer or proof-of-possession tokens |
| Continuation | `continuation` | Grant update, cancel, and polling support |
| Identifier | `identifier` | Wallet address scoping for access rights (Open Payments) |
| Limits | `limits` | Financial constraints: debitAmount, receiveAmount, interval |

## Integration with ShujaaPay

[ShujaaPay](https://www.shujaapay.me) is an Open Payments-compliant fintech platform built on the Interledger Protocol. The `x-gnap` extension powers ShujaaPay's authentication layer:

```
┌─────────────────────────────────────────────────────────────┐
│                    ShujaaPay Platform                        │
│                   www.shujaapay.me                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Gateway     │  │  Wallet Service  │  │   Payments   │  │
│  │  (Node.js)    │──│   (Node.js)      │──│  (Node.js)   │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────┘  │
│         │                   │                                │
│  ┌──────┴───────────────────┴──────────────────────────┐    │
│  │            GNAP Authentication Layer                 │    │
│  │                                                      │    │
│  │  x-gnap extension  ──→  Schema validation            │    │
│  │  kiota-gnap-auth-ts ──→  SDK token management        │    │
│  │  http-signatures    ──→  RFC 9421 request signing    │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### How it works in production:

1. **API Definition** — ShujaaPay's OpenAPI spec uses `x-gnap` to describe GNAP auth requirements
2. **SDK Generation** — Kiota reads `x-gnap` and generates type-safe GNAP clients
3. **Token Lifecycle** — `@shujaapay/kiota-gnap-auth-ts` manages grant requests, token rotation, and continuation
4. **Request Signing** — `@shujaapay/http-message-signatures` signs every API call per RFC 9421
5. **Wallet Scoping** — Access rights use `identifier` to scope grants to specific wallet addresses (e.g., `https://wallet.shujaapay.me/alice`)

### Install

```bash
# npm
npm install @shujaapay/gnap-openapi-security-scheme

# Use in your project
const schema = require('@shujaapay/gnap-openapi-security-scheme');
```

## Relationship to Other Projects

This specification is part of the **[ShujaaPay](https://www.shujaapay.me) GNAP Stack** — open-source tooling for the [Open Payments](https://openpayments.dev) ecosystem:

| Repo | Package | Status |
|------|---------|--------|
| **This repo** — GNAP OpenAPI Security Scheme | `@shujaapay/gnap-openapi-security-scheme` | 🔧 In progress |
| [`kiota-gnap-auth-ts`](https://github.com/REN-100/kiota-gnap-auth-ts) — Kiota GNAP Provider (TypeScript) | [`@shujaapay/kiota-gnap-auth-ts`](https://www.npmjs.com/package/@shujaapay/kiota-gnap-auth-ts) | 🔧 In progress |
| [`kiota-gnap-auth-python`](https://github.com/REN-100/kiota-gnap-auth-python) — Kiota GNAP Provider (Python) | [`shujaapay-kiota-gnap-auth`](https://pypi.org/project/shujaapay-kiota-gnap-auth/) | 🔧 In progress |
| [`http-message-signatures`](https://github.com/REN-100/http-message-signatures-ts) — RFC 9421 library | `@shujaapay/http-message-signatures` | 🔧 In progress |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Key areas where we need help:
- Review of the x-gnap schema for completeness
- Testing with different SDK generators
- Feedback on the OAS proposal draft
- Additional examples for different GNAP configurations

## References

- [ShujaaPay](https://www.shujaapay.me) — Open Payments-compliant fintech platform
- [RFC 9635 - Grant Negotiation and Authorization Protocol (GNAP)](https://www.rfc-editor.org/rfc/rfc9635)
- [RFC 9421 - HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Open Payments](https://openpayments.dev)
- [Interledger Protocol](https://interledger.org)
- [Microsoft Kiota](https://learn.microsoft.com/en-us/openapi/kiota/)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built by [ShujaaPay](https://www.shujaapay.me) — Global Payments. Local Freedom.
