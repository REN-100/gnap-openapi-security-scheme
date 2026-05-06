# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-05-07

### Added
- `identifier` field in AccessRight for wallet address scoping (Open Payments §3)
- `limits` field in AccessRight with `AccessLimits` definition (debitAmount, receiveAmount, interval)
- `Amount` type definition (value, assetCode, assetScale) per Open Payments spec
- 8 new tests for Open Payments-specific features (36 total)
- npm publish configuration with `@shujaapay` scope
- ShujaaPay platform integration documentation and architecture diagram
- ShujaaPay branding badges

### Changed
- Updated inline schema example to showcase `identifier` and `limits` fields
- Related repos now show "In progress" status

## [1.0.0] - 2026-05-06

### Added
- `x-gnap` JSON Schema (JSON Schema 2020-12) for GNAP security in OpenAPI documents
- Core fields: `grant_endpoint`, `token_formats`, `key_proofs`, `interaction`, `access_rights`
- `continuation` support (poll, wait) per RFC 9635 §5
- `token_management` (rotation, revocation, introspection) per RFC 9635 §6
- `key_rotation` flag
- `KeyProof` definition with httpsig, mtls, jwsd, dpop methods
- `AccessRight` definition with type, actions, locations, datatypes
- 29 schema validation tests (Ajv 2020-12)
- CI pipeline (Node 18/20/22 matrix)
- Annotated Open Payments spec example (`specs/open-payments-gnap.yaml`)
- GNAP Primer documentation (`docs/GNAP-PRIMER.md`)
- OAS TSC Proposal draft (`docs/OAS-PROPOSAL.md`)
- Example configurations: basic and full-featured
