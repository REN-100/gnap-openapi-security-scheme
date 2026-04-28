# GNAP OpenAPI Security Scheme - Specification

## 1. Introduction

This document specifies the `x-gnap` vendor extension for the OpenAPI Specification (OAS 3.1.x). The extension enables API designers to describe GNAP (Grant Negotiation and Authorization Protocol, RFC 9635) authorization requirements in a machine-readable format that SDK generators can consume.

## 2. Motivation

### 2.1 The Gap

OAS 3.1 defines five security scheme types:

| Type | Standard | OAS Support |
|---|---|---|
| `apiKey` | Various | Native |
| `http` | RFC 7235 | Native |
| `mutualTLS` | RFC 8705 | Native |
| `oauth2` | RFC 6749 | Native |
| `openIdConnect` | OIDC Discovery | Native |
| **`gnap`** | **RFC 9635** | **Not supported** |

GNAP is an IETF Internet Standard that provides richer authorization capabilities than OAuth 2.0, including key-bound access tokens, multiple interaction modes, and grant continuation. It is the authorization protocol used by Open Payments, the Interledger payment initiation standard.

### 2.2 Impact

Without GNAP support in OpenAPI:
- SDK generators silently drop authentication when processing GNAP-protected API documents
- Developers must hand-build GNAP flows from scratch
- The barrier to entry for Open Payments integration remains prohibitively high

## 3. Extension Specification

### 3.1 Placement

The `x-gnap` extension is placed within a Security Scheme Object:

```yaml
components:
  securitySchemes:
    gnap_auth:
      type: apiKey        # Placeholder for OAS compatibility
      in: header
      name: Authorization
      x-gnap:             # <-- The extension
        grant_endpoint: "https://auth.example.com/"
        # ... additional GNAP configuration
```

### 3.2 Required Fields

| Field | Type | Description |
|---|---|---|
| `grant_endpoint` | `string` (URI) | The GNAP authorization server's grant endpoint URL |

### 3.3 Optional Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `token_formats` | `string[]` | `["bearer"]` | Supported token formats |
| `key_proofs` | `KeyProof[]` | - | Supported key proof mechanisms |
| `interaction` | `object` | - | Supported interaction modes |
| `access_rights` | `AccessRight[]` | - | Defined resource access rights |
| `continuation` | `object` | - | Grant continuation configuration |
| `key_rotation` | `boolean` | `false` | Key rotation support |
| `token_management` | `object` | - | Token rotation and revocation |

### 3.4 Key Proof Object

```yaml
key_proofs:
  - method: httpsig       # RFC 9421 HTTP Message Signatures
    alg:
      - ed25519
      - ecdsa-p256-sha256
    content_digest: true   # Require Content-Digest for bodies
  - method: mtls           # Mutual TLS
  - method: jwsd           # JWS Detached
```

Supported methods map directly to RFC 9635 Section 7.3:
- `httpsig` - HTTP Message Signatures (RFC 9421)
- `mtls` - Mutual TLS (RFC 8705)
- `jwsd` - Detached JWS
- `dpop` - DPoP (RFC 9449)

### 3.5 Interaction Object

```yaml
interaction:
  start:
    - redirect      # Redirect the resource owner to a URL
    - user_code     # Display a code for the user to enter
  finish:
    - redirect      # Redirect back to the client
    - push          # Push notification to the client
```

### 3.6 Access Rights

```yaml
access_rights:
  - type: incoming-payment
    actions: [create, read, read-all, list, complete]
  - type: outgoing-payment
    actions: [create, read, read-all, list]
    locations:
      - https://wallet.example/
```

## 4. Dual-Track Strategy

### 4.1 Immediate: Vendor Extension (`x-gnap`)

The `x-gnap` extension works with current OAS 3.1 tooling. SDK generators that understand the extension can consume it; those that don't will simply ignore it (per OAS extension semantics).

### 4.2 Future: Native OAS Support

We will submit a formal proposal to the OpenAPI Technical Steering Committee for native GNAP support, potentially as part of the OAS 4.0 (Moonwalk) initiative. The `x-gnap` schema is designed to map cleanly onto a future native `gnap` security scheme type.

## 5. Tooling Integration

### 5.1 Kiota

The `x-gnap` extension is consumed by the Kiota GNAP Authentication Provider:

```bash
kiota generate -l typescript \
  -d open-payments.yaml \
  --auth-provider @shujaapay/kiota-gnap-ts
```

### 5.2 Other Generators

Any SDK generator can be extended to support `x-gnap` by:
1. Detecting the `x-gnap` key in security scheme objects
2. Parsing the GNAP configuration
3. Generating appropriate authentication code

## 6. References

- RFC 9635: Grant Negotiation and Authorization Protocol (GNAP)
- RFC 9421: HTTP Message Signatures
- RFC 9530: Digest Fields
- OpenAPI Specification 3.1.0
- Open Payments Protocol Specification
