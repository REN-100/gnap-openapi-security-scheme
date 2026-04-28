# GNAP OpenAPI Security Scheme (`x-gnap`)

> A vendor extension and formal proposal to add GNAP (RFC 9635) as a security scheme type in the OpenAPI Specification, enabling automated SDK generation for Open Payments and other GNAP-protected APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-blue.svg)](https://spec.openapis.org/oas/v3.1.0)
[![RFC 9635](https://img.shields.io/badge/RFC-9635-orange.svg)](https://www.rfc-editor.org/rfc/rfc9635)

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
    validate-schema.js          # Schema validation tests
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
| Access Rights | `access_rights` | Fine-grained resource permissions |
| Token Format | `token_formats` | Bearer or proof-of-possession tokens |
| Continuation | `continuation` | Grant update, cancel, and polling support |

## Relationship to Other Projects

This specification is part of the **ShujaaPay GNAP Stack**, funded by the Interledger Foundation:

- **This repo** - GNAP OpenAPI Security Scheme (Workstream 1)
- [`http-message-signatures`](https://github.com/REN-100/http-message-signatures-ts) - RFC 9421 library (Workstream 4)
- Kiota GNAP Provider (TypeScript) - Coming soon (Workstream 2)
- Kiota GNAP Provider (Python) - Coming soon (Workstream 3)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Key areas where we need help:
- Review of the x-gnap schema for completeness
- Testing with different SDK generators
- Feedback on the OAS proposal draft
- Additional examples for different GNAP configurations

## References

- [RFC 9635 - Grant Negotiation and Authorization Protocol (GNAP)](https://www.rfc-editor.org/rfc/rfc9635)
- [RFC 9421 - HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Open Payments](https://openpayments.dev)
- [Interledger Protocol](https://interledger.org)
- [Microsoft Kiota](https://learn.microsoft.com/en-us/openapi/kiota/)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

This project is supported by the [Interledger Foundation](https://interledger.org) through the SDK Grant Program.
