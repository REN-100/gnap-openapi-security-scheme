# GNAP Primer for API Designers

> A quick introduction to GNAP (RFC 9635) for developers familiar with OAuth 2.0 who need to understand GNAP authorization for API design.

## What is GNAP?

**GNAP** (Grant Negotiation and Authorization Protocol, RFC 9635) is an IETF Internet Standard that provides fine-grained authorization for APIs. It's the successor to OAuth 2.0/2.1, designed from the ground up to address OAuth's limitations.

GNAP is the authorization protocol mandated by [Open Payments](https://openpayments.dev), the payment initiation standard for the Interledger Protocol.

## GNAP vs OAuth 2.0: Key Differences

| Aspect | OAuth 2.0 | GNAP |
|--------|-----------|------|
| **Grant request** | URL-encoded form POST | JSON POST body |
| **Client identification** | Pre-registered `client_id` | Asymmetric key (JWK) — no pre-registration needed |
| **Request signing** | None (Bearer token only) | HTTP Message Signatures (RFC 9421) |
| **Token binding** | Optional (DPoP) | First-class key-bound tokens |
| **Interaction modes** | Redirect only | Redirect, app launch, user code, push |
| **Grant continuation** | Not supported | Built-in state machine for multi-step flows |
| **Resource specification** | Scopes (strings) | Typed access rights with actions and identifiers |

## The GNAP Flow

```
1. Client → AS:  POST grant_endpoint (JSON body with access rights + client key)
2. AS → Client:  Response (token, interaction required, or continuation)
3. Client → RO:  Redirect user to AS for approval (if interactive)
4. RO → AS:      Approves the grant
5. AS → Client:  Callback with interact_ref
6. Client → AS:  POST continue_uri (with interact_ref)
7. AS → Client:  Access token
8. Client → RS:  API request with GNAP token + HTTP Message Signature
```

## Key Concepts for API Designers

### 1. Grant Endpoint

The single URL where clients initiate all grant requests. Unlike OAuth's multiple endpoints (authorize, token, introspect, revoke), GNAP uses one endpoint for grant requests and separate management URIs returned in responses.

```yaml
x-gnap:
  grant_endpoint: "https://auth.wallet.example/"
```

### 2. Key Proofs

GNAP clients prove possession of their key with every request. The most common method is **HTTP Message Signatures** (RFC 9421), which signs the request method, URL, authorization header, and body digest.

```yaml
x-gnap:
  key_proofs:
    - method: httpsig
      alg: [ed25519, ecdsa-p256-sha256]
      content_digest: true   # Require body integrity
```

### 3. Access Rights (Not Scopes)

Instead of OAuth's flat scope strings, GNAP uses structured **access rights** with types, actions, identifiers, and locations.

```yaml
# OAuth 2.0: scope = "incoming-payment:create incoming-payment:read"
# GNAP:
x-gnap:
  access_rights:
    - type: incoming-payment
      actions: [create, read, list, complete]
      # Optional: scope to a specific wallet
      locations:
        - https://wallet.example/alice
```

### 4. Interaction Modes

GNAP supports multiple ways for the resource owner to approve a grant:

| Mode | Use Case |
|------|----------|
| `redirect` | Web apps — redirect user to AS |
| `app` | Mobile apps — launch native AS app |
| `user_code` | Device flow — display code for user to enter |
| `user_code_uri` | Smart TV — show code and URL |

### 5. Token Formats

| Format | Description |
|--------|-------------|
| `bearer` | Standard bearer token (like OAuth) |
| `pop` | Proof-of-possession — token is bound to the client's key |

### 6. Grant Continuation

GNAP grants can be updated, extended, or cancelled after issuance:

- **Rotation** (§6.1) — Get a new token from the management URI
- **Revocation** (§6.2) — Revoke a token via DELETE to management URI
- **Introspection** (§6.3) — Check token status via GET to management URI

## For Open Payments

Open Payments uses GNAP with these specifics:

- **Key proof**: `httpsig` with `ed25519` (preferred) or `ecdsa-p256-sha256`
- **Token format**: `bearer` (with HTTP Message Signature for proof)
- **Content-Digest**: Required for all POST/PUT/PATCH requests
- **Interaction**: `redirect` for outgoing payments (user approval needed)
- **No interaction**: Incoming payments can be granted immediately
- **Access rights**: `incoming-payment`, `outgoing-payment`, `quote`

### Typical ShujaaPay Flow

```
App → resolve_wallet_address("https://wallet.shujaapay.me/alice")
    → discovers auth_server: "https://auth.shujaapay.me"
App → POST https://auth.shujaapay.me/ (grant request with access rights)
    → receives access_token with manage URI
App → GET https://wallet.shujaapay.me/incoming-payments
    → Authorization: GNAP {token}
    → Signature + Signature-Input headers (RFC 9421)
    → Content-Digest header (RFC 9530)
```

## Further Reading

- [RFC 9635 — GNAP](https://www.rfc-editor.org/rfc/rfc9635) — The full specification
- [RFC 9421 — HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421) — Request signing
- [RFC 9530 — Digest Fields](https://www.rfc-editor.org/rfc/rfc9530) — Content integrity
- [Open Payments](https://openpayments.dev) — Payment initiation on Interledger
- [ShujaaPay GNAP Stack](https://github.com/REN-100) — SDKs and tooling
