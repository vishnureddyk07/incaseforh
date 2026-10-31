import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeCloudshopeMobile,
  requestMaskedCallNumber,
} from '../services/cloudshopeCall.js';

const env = { CLOUDSHOPE_API_TOKEN: 'test-token' };
const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

test('normalizes phone numbers without changing their country code', () => {
  assert.equal(normalizeCloudshopeMobile('+91 98765-43210'), '919876543210');
  assert.equal(normalizeCloudshopeMobile('98765 43210'), '9876543210');
  assert.throws(() => normalizeCloudshopeMobile('1234'), /invalid phone number/);
});

test('requests and returns a Cloudshope DID using the server token', async () => {
  let request;
  const did = await requestMaskedCallNumber('+91 98765-43210', {
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ status: 200, message: 'success', data: { did: '06746833156' } });
    },
  });

  assert.equal(did, '06746833156');
  assert.equal(request.url, 'https://cloudshope.com/api/v1/outboundCallApis/outboundCallQr');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(request.options.body), { mobile_number: '919876543210' });
});

test('fails closed when configuration or the provider response is invalid', async () => {
  await assert.rejects(
    requestMaskedCallNumber('9876543210', {
      env: {},
      fetchImpl: async () => {
        throw new Error('provider should not be called');
      },
    }),
    /not configured/
  );
  await assert.rejects(
    requestMaskedCallNumber('9876543210', {
      env,
      fetchImpl: async () => jsonResponse({ status: 200, data: {} }),
    }),
    /valid masked number/
  );
  await assert.rejects(
    requestMaskedCallNumber('9876543210', {
      env,
      fetchImpl: async () => jsonResponse({ message: 'unauthorized' }, 401),
    }),
    /HTTP 401/
  );
});
