import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMsg91Mobile, resendOtp, sendOtp, verifyOtp } from '../services/msg91Otp.js';

const env = { MSG91_AUTH_KEY: 'test-auth-key', MSG91_TEMPLATE_ID: 'test-template' };

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

test('normalizes local Indian numbers and preserves international numbers', () => {
  assert.equal(normalizeMsg91Mobile('98765 43210'), '919876543210');
  assert.equal(normalizeMsg91Mobile('+44 7700 900123'), '447700900123');
  assert.throws(() => normalizeMsg91Mobile('1234'), /country code/);
});

test('sends an OTP using the documented MSG91 v5 contract', async () => {
  let request;
  const providerRequestId = await sendOtp('919876543210', {
    env,
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return jsonResponse({ type: 'success', request_id: 'provider-request-1' });
    },
  });

  assert.equal(providerRequestId, 'provider-request-1');
  assert.equal(request.url.pathname, '/api/v5/otp');
  assert.equal(request.url.searchParams.get('mobile'), '919876543210');
  assert.equal(request.url.searchParams.get('template_id'), 'test-template');
  assert.equal(request.url.searchParams.get('otp_length'), '6');
  assert.equal(request.options.headers.authkey, env.MSG91_AUTH_KEY);
});

test('fails closed on provider and configuration errors', async () => {
  await assert.rejects(
    sendOtp('919876543210', {
      env: { MSG91_TEMPLATE_ID: env.MSG91_TEMPLATE_ID },
      fetchImpl: async () => {
        throw new Error('network details should not escape');
      },
    }),
    /MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be configured/
  );
  await assert.rejects(
    sendOtp('919876543210', {
      env,
      fetchImpl: async () => jsonResponse({ type: 'error', message: 'invalid template' }),
    }),
    /did not accept the OTP request/
  );
  await assert.rejects(
    sendOtp('919876543210', {
      env,
      fetchImpl: async () => jsonResponse({ type: 'error' }, 401),
    }),
    /HTTP 401/
  );
});

test('verifies OTP only when MSG91 returns type success', async () => {
  const verified = await verifyOtp('919876543210', '123456', {
    env,
    fetchImpl: async (url, options) => {
      const requestUrl = new URL(url);
      assert.equal(requestUrl.pathname, '/api/v5/otp/verify');
      assert.equal(requestUrl.searchParams.get('otp'), '123456');
      assert.equal(options.headers.authkey, env.MSG91_AUTH_KEY);
      return jsonResponse({ type: 'success', message: 'OTP verified success' });
    },
  });
  const rejected = await verifyOtp('919876543210', '000000', {
    env,
    fetchImpl: async () => jsonResponse({ type: 'error', message: 'OTP not match' }),
  });
  assert.equal(verified, true);
  assert.equal(rejected, false);
});

test('resends by text and rejects provider retry errors', async () => {
  let requestUrl;
  await resendOtp('919876543210', {
    env,
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return jsonResponse({ type: 'success', message: 'OTP resent' });
    },
  });
  assert.equal(requestUrl.pathname, '/api/v5/otp/retry');
  assert.equal(requestUrl.searchParams.get('retrytype'), 'text');
  assert.equal(requestUrl.searchParams.get('mobile'), '919876543210');
  await assert.rejects(
    resendOtp('919876543210', {
      env,
      fetchImpl: async () => jsonResponse({ type: 'error', message: 'OTP retry count maxed out' }),
    }),
    /could not resend/
  );
});
