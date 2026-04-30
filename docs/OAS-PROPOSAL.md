# Proposal: Add GNAP (RFC 9635) as an OpenAPI Security Scheme Type

**Authors:** Super App Africa Limited (ShujaaPay)  
**Date:** April 2026  
**Status:** Draft Proposal  
**Target:** OpenAPI Technical Steering Committee (TSC)  
**Funded by:** Interledger Foundation — SDK Grant Program

---

## 1. Executive Summary

This proposal requests the addition of **GNAP (Grant Negotiation and Authorization Protocol, RFC 9635)** as a native security scheme type in the OpenAPI Specification, alongside the existing `apiKey`, `http`, `mutualTLS`, `oauth2`, and `openIdConnect` types.

GNAP is the successor to OAuth 2.0/2.1 for fine-grained authorization, and is the authorization protocol mandated by the **Open Payments** standard — the payment initiation layer of the Interledger Protocol. Without native OAS support, every developer integrating with GNAP-protected APIs must hand-build the entire authorization flow.

## 2. Problem Statement

### 2.1 Current Limitation

The OpenAPI Specification 3.1 defines five security scheme types (§4.8.27):

| Type | RFC | Purpose |
|------|-----|---------|
| `apiKey` | — | Static API keys |
| `http` | RFC 7235 | HTTP Authentication (Bearer, Basic, etc.) |
| `mutualTLS` | RFC 8705 | Client certificate authentication |
| `oauth2` | RFC 6749 | OAuth 2.0 authorization flows |
| `openIdConnect` | OIDC | OpenID Connect Discovery |

**GNAP (RFC 9635) is not represented.** This means:

1. **SDK generators cannot model GNAP auth.** Kiota, OpenAPI Generator, and Swagger Codegen silently drop GNAP authentication when processing an OpenAPI document.
2. **API documentation is incomplete.** Tools like Swagger UI and Redocly cannot display GNAP requirements.
3. **Developers must re-implement GNAP from scratch** for every integration — reading RFCs, building token lifecycle management, constructing HTTP Message Signature headers (RFC 9421), and handling grant continuation state machines.

### 2.2 Real-World Impact

The Open Payments standard (openpayments.dev), built on the Interledger Protocol, mandates GNAP for all payment initiation requests. This affects:

- **Wallet providers** (Rafiki-based wallets serving millions of users across Africa, Southeast Asia, and Latin America)
- **Payment service providers** building on Interledger
- **Mobile money operators** integrating cross-border payment rails
- **FinTech platforms** (e.g., ShujaaPay) that need programmatic access to Open Payments APIs

Without OAS-level GNAP support, the barrier to entry for the Interledger ecosystem is unnecessarily high.

## 3. Proposed Solution

### 3.1 New Security Scheme Type: `gnap`

```yaml
components:
  securitySchemes:
    gnap_auth:
      type: gnap
      grantEndpoint: "https://auth.wallet.example.com/"
      tokenFormats:
        - bearer
        - pop
      keyProofs:
        - method: httpsig
          algorithms:
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
      accessRights:
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

### 3.2 Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | ✅ | Must be `"gnap"` |
| `grantEndpoint` | `string (url)` | ✅ | URL where clients initiate grant requests (RFC 9635 §2) |
| `tokenFormats` | `string[]` | ❌ | `bearer` and/or `pop` (proof-of-possession). Default: `["bearer"]` |
| `keyProofs` | `KeyProof[]` | ❌ | Key proof methods: `httpsig` (RFC 9421), `mtls`, `jwsd`, `jws` |
| `interaction` | `Interaction` | ❌ | How the resource owner interacts (redirect, user_code) |
| `accessRights` | `AccessRight[]` | ❌ | Fine-grained resource permissions |
| `continuation` | `Continuation` | ❌ | Grant continuation capabilities (update, cancel, poll) |

### 3.3 Relationship to Existing Types

GNAP is **not expressible** as any existing type:

- **Not `oauth2`**: GNAP has fundamentally different grant negotiation (JSON-based POST, not URL-encoded), supports asymmetric key proofs, and has a continuation API.
- **Not `http`**: GNAP tokens require proof-of-possession via HTTP Message Signatures, not just a static Bearer header.
- **Not `mutualTLS`**: GNAP supports mTLS as one of several key proof methods, but mTLS alone doesn't describe the grant flow.

## 4. Interim Solution: `x-gnap` Vendor Extension

While this proposal is under review, we have published an `x-gnap` vendor extension that provides immediate functionality:

- **Repository:** [github.com/REN-100/gnap-openapi-security-scheme](https://github.com/REN-100/gnap-openapi-security-scheme)
- **JSON Schema:** Formal validation schema for the extension
- **Annotated Open Payments Spec:** The official Open Payments OpenAPI document with `x-gnap` annotations
- **Kiota Integration:** TypeScript and Python authentication providers that consume the `x-gnap` extension

## 5. Compatibility

### 5.1 Backward Compatibility

Adding a new security scheme type is a **non-breaking change**. Existing documents are unaffected. Tools that do not support the `gnap` type will ignore it, just as they currently ignore unrecognized `x-*` extensions.

### 5.2 Forward Compatibility

The `gnap` type is designed to be extensible. New key proof methods (e.g., DPoP-like proofs) and interaction modes can be added without modifying the schema.

## 6. Implementation Status

| Component | Status | Link |
|-----------|--------|------|
| `x-gnap` JSON Schema | ✅ Complete | `schemas/x-gnap-extension.json` |
| Annotated Open Payments Spec | ✅ Complete | `specs/open-payments-gnap.yaml` |
| Kiota GNAP Provider (TypeScript) | 🔄 In Progress | `kiota-gnap-auth-ts` |
| Kiota GNAP Provider (Python) | 🔄 In Progress | `kiota-gnap-auth-python` |
| HTTP Message Signatures (TypeScript) | ✅ Complete | `http-message-signatures-ts` |

## 7. References

1. RFC 9635 — Grant Negotiation and Authorization Protocol (GNAP), IETF, 2024
2. RFC 9421 — HTTP Message Signatures, IETF, 2024
3. OpenAPI Specification 3.1.0, §4.8.27 Security Scheme Object
4. Open Payments API Specification — openpayments.dev
5. Interledger Protocol — interledger.org
6. Microsoft Kiota — learn.microsoft.com/en-us/openapi/kiota/

---

**Submitted by:**  
Super App Africa Limited  
ShujaaPay — Global Payments. Local Freedom.  
Interledger Foundation SDK Grant Recipient  
Contact: rensonmumbo@gmail.com
