#!/usr/bin/env node
/**
 * GNAP OpenAPI Security Scheme — Schema Validation Tests
 *
 * Validates the x-gnap JSON Schema and example documents against it.
 * Uses Ajv (Another JSON Schema Validator) for JSON Schema 2020-12 validation.
 *
 * Usage:
 *   node tests/validate-schema.js                 # Run all built-in tests
 *   node tests/validate-schema.js your-api.yaml   # Validate a custom file
 *
 * @see https://www.rfc-editor.org/rfc/rfc9635
 */

const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// --- Setup ---
const schemaPath = path.join(__dirname, '..', 'schemas', 'x-gnap-extension.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// --- Helper: extract x-gnap from YAML ---
function extractXGnap(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(content);
  const schemes = doc?.components?.securitySchemes || {};
  for (const [, scheme] of Object.entries(schemes)) {
    if (scheme['x-gnap']) return scheme['x-gnap'];
  }
  return null;
}

// ===== TEST SUITE =====
console.log('\n🔒 GNAP OpenAPI Security Scheme — Schema Validation\n');

// --- 1. Schema self-consistency ---
console.log('Schema Structure:');

test('Schema has $schema declaration', () => {
  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema');
});

test('Schema has $id', () => {
  assert(schema.$id.includes('x-gnap-extension'));
});

test('Schema requires grant_endpoint', () => {
  assert(schema.required.includes('grant_endpoint'));
});

test('Schema defines KeyProof $def', () => {
  assert(schema.$defs?.KeyProof);
  assert(schema.$defs.KeyProof.required.includes('method'));
});

test('Schema defines AccessRight $def', () => {
  assert(schema.$defs?.AccessRight);
  assert(schema.$defs.AccessRight.required.includes('type'));
});

test('Schema includes inline examples', () => {
  assert(Array.isArray(schema.examples) && schema.examples.length > 0);
});

test('grant_endpoint has URI format', () => {
  assert(schema.properties.grant_endpoint.format === 'uri');
});

test('token_formats allows bearer and pop', () => {
  const items = schema.properties.token_formats.items;
  assert(items.enum.includes('bearer'));
  assert(items.enum.includes('pop'));
});

test('key_proofs supports httpsig, mtls, jwsd, dpop', () => {
  const methods = schema.$defs.KeyProof.properties.method.enum;
  assert(methods.includes('httpsig'));
  assert(methods.includes('mtls'));
  assert(methods.includes('jwsd'));
  assert(methods.includes('dpop'));
});

test('interaction start modes include redirect, app, user_code', () => {
  const start = schema.properties.interaction.properties.start.items.enum;
  assert(start.includes('redirect'));
  assert(start.includes('app'));
  assert(start.includes('user_code'));
});

test('continuation has supported, poll, wait fields', () => {
  const cont = schema.properties.continuation.properties;
  assert(cont.supported);
  assert(cont.poll);
  assert(cont.wait);
});

test('token_management has rotation and revocation', () => {
  const tm = schema.properties.token_management.properties;
  assert(tm.rotation);
  assert(tm.revocation);
});

// --- 2. Valid document tests ---
console.log('\nValid Documents:');

test('Minimal valid: only grant_endpoint', () => {
  const valid = validate({ grant_endpoint: 'https://auth.example.com/' });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Full Open Payments configuration', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    token_formats: ['bearer'],
    key_proofs: [
      { method: 'httpsig', alg: ['ed25519', 'ecdsa-p256-sha256'], content_digest: true },
    ],
    interaction: {
      start: ['redirect', 'user_code'],
      finish: ['redirect'],
    },
    access_rights: [
      { type: 'incoming-payment', actions: ['create', 'read', 'list', 'complete'] },
      { type: 'outgoing-payment', actions: ['create', 'read', 'list'] },
      { type: 'quote', actions: ['create', 'read'] },
    ],
    continuation: { supported: true, poll: true, wait: true },
    token_management: { rotation: true, revocation: true },
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Bearer-only token format', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    token_formats: ['bearer'],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('POP token with mTLS proof', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    token_formats: ['pop'],
    key_proofs: [{ method: 'mtls' }],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Multiple key proof methods', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    key_proofs: [
      { method: 'httpsig', alg: ['ed25519'] },
      { method: 'mtls' },
      { method: 'jwsd' },
      { method: 'dpop', alg: ['ecdsa-p256-sha256'] },
    ],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Access rights with locations', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create'],
        locations: ['https://wallet.example/alice'],
      },
    ],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Inline schema example validates', () => {
  const valid = validate(schema.examples[0]);
  assert(valid, `Schema inline example failed: ${JSON.stringify(validate.errors)}`);
});

// --- 3. Invalid document tests ---
console.log('\nInvalid Documents:');

test('Rejects missing grant_endpoint', () => {
  const valid = validate({ token_formats: ['bearer'] });
  assert(!valid, 'Should have rejected missing grant_endpoint');
  assert(validate.errors.some(e => e.params?.missingProperty === 'grant_endpoint'));
});

test('Rejects invalid token format', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    token_formats: ['invalid_format'],
  });
  assert(!valid, 'Should have rejected invalid token format');
});

test('Rejects invalid key proof method', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    key_proofs: [{ method: 'invalid_method' }],
  });
  assert(!valid, 'Should have rejected invalid key proof method');
});

test('Rejects key proof without method', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    key_proofs: [{ alg: ['ed25519'] }],
  });
  assert(!valid, 'Should have rejected key proof without method');
});

test('Rejects invalid interaction start mode', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    interaction: { start: ['invalid_mode'] },
  });
  assert(!valid, 'Should have rejected invalid interaction mode');
});

test('Rejects invalid interaction finish mode', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    interaction: { finish: ['invalid_finish'] },
  });
  assert(!valid, 'Should have rejected invalid finish mode');
});

test('Rejects invalid signing algorithm', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.example.com/',
    key_proofs: [{ method: 'httpsig', alg: ['invalid_alg'] }],
  });
  assert(!valid, 'Should have rejected invalid algorithm');
});

// --- 4. Open Payments-specific features ---
console.log('\nOpen Payments Features:');

test('AccessRight with identifier (wallet address scoping)', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create', 'read'],
        identifier: 'https://wallet.example/alice',
      },
    ],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('AccessRight with limits (debitAmount + receiveAmount)', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create'],
        identifier: 'https://wallet.example/alice',
        limits: {
          debitAmount: { value: '50000', assetCode: 'USD', assetScale: 2 },
          receiveAmount: { value: '50000', assetCode: 'USD', assetScale: 2 },
        },
      },
    ],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('AccessRight with limits and interval (recurring payments)', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create'],
        limits: {
          debitAmount: { value: '100000', assetCode: 'KES', assetScale: 2 },
          interval: 'R/2026-01-01T00:00:00Z/P1M',
        },
      },
    ],
  });
  assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
});

test('Rejects Amount with invalid assetCode (lowercase)', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create'],
        limits: {
          debitAmount: { value: '50000', assetCode: 'usd', assetScale: 2 },
        },
      },
    ],
  });
  assert(!valid, 'Should reject lowercase currency code');
});

test('Rejects Amount missing required fields', () => {
  const valid = validate({
    grant_endpoint: 'https://auth.wallet.example/',
    access_rights: [
      {
        type: 'outgoing-payment',
        actions: ['create'],
        limits: {
          debitAmount: { value: '50000' },
        },
      },
    ],
  });
  assert(!valid, 'Should reject Amount missing assetCode and assetScale');
});

test('Schema defines AccessLimits $def', () => {
  assert(schema.$defs?.AccessLimits);
  assert(schema.$defs.AccessLimits.properties.debitAmount);
  assert(schema.$defs.AccessLimits.properties.receiveAmount);
  assert(schema.$defs.AccessLimits.properties.interval);
});

test('Schema defines Amount $def', () => {
  assert(schema.$defs?.Amount);
  assert(schema.$defs.Amount.required.includes('value'));
  assert(schema.$defs.Amount.required.includes('assetCode'));
  assert(schema.$defs.Amount.required.includes('assetScale'));
});

test('AccessRight has identifier field in schema', () => {
  assert(schema.$defs.AccessRight.properties.identifier);
  assert(schema.$defs.AccessRight.properties.identifier.format === 'uri');
});

// --- 5. YAML example file validation ---
console.log('\nExample Files:');

const examplesDir = path.join(__dirname, '..', 'examples');
const exampleFiles = fs.readdirSync(examplesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

for (const file of exampleFiles) {
  test(`examples/${file} has valid x-gnap`, () => {
    const xgnap = extractXGnap(path.join(examplesDir, file));
    assert(xgnap, `No x-gnap extension found in ${file}`);
    const valid = validate(xgnap);
    assert(valid, `Validation errors in ${file}: ${JSON.stringify(validate.errors)}`);
  });
}

// --- 6. Custom file validation (CLI) ---
const customFile = process.argv[2];
if (customFile) {
  console.log(`\nCustom File: ${customFile}`);
  test(`${customFile} has valid x-gnap`, () => {
    const xgnap = extractXGnap(customFile);
    assert(xgnap, `No x-gnap extension found in ${customFile}`);
    const valid = validate(xgnap);
    assert(valid, `Validation errors: ${JSON.stringify(validate.errors)}`);
  });
}

// --- Summary ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All schema validation tests passed!\n');
}
