const MSG91_BASE_URL = 'https://control.msg91.com';

export class Msg91Error extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'Msg91Error';
    this.statusCode = statusCode;
  }
}

const getConfig = (env) => {
  const authKey = env.MSG91_AUTH_KEY?.trim();
  const templateId = env.MSG91_TEMPLATE_ID?.trim();
  if (!authKey || !templateId) {
    throw new Msg91Error('MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be configured.', 503);
  }
  return { authKey, templateId };
};

const parseResponse = async (response) => {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Msg91Error('MSG91 returned an invalid response.');
  }
  if (!response.ok) {
    throw new Msg91Error(`MSG91 request failed (HTTP ${response.status}).`);
  }
  return payload;
};

const requestProvider = async (fetchImpl, url, options) => {
  try {
    return await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Msg91Error('MSG91 request failed or timed out.');
  }
};

export const normalizeMsg91Mobile = (phoneNumber, defaultCountryCode = '91') => {
  const raw = String(phoneNumber || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Msg91Error('A valid phone number is required.', 400);
  const mobile = raw.startsWith('+')
    ? digits
    : digits.length === 10
      ? `${defaultCountryCode.replace(/\D/g, '')}${digits}`
      : digits;
  if (mobile.length < 11 || mobile.length > 15) {
    throw new Msg91Error('Phone number must include a valid country code.', 400);
  }
  return mobile;
};

export const sendOtp = async (mobile, { env = process.env, fetchImpl = fetch } = {}) => {
  const { authKey, templateId } = getConfig(env);
  const url = new URL('/api/v5/otp', MSG91_BASE_URL);
  url.searchParams.set('template_id', templateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp_length', '6');
  url.searchParams.set('otp_expiry', '5');

  const response = await requestProvider(fetchImpl, url, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'content-type': 'application/json',
    },
  });
  const payload = await parseResponse(response);
  if (payload?.type !== 'success' || typeof payload.request_id !== 'string' || !payload.request_id) {
    throw new Msg91Error('MSG91 did not accept the OTP request.');
  }
  return payload.request_id;
};

export const verifyOtp = async (mobile, otp, { env = process.env, fetchImpl = fetch } = {}) => {
  const { authKey } = getConfig(env);
  const url = new URL('/api/v5/otp/verify', MSG91_BASE_URL);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);
  const response = await requestProvider(fetchImpl, url, {
    method: 'GET',
    headers: { authkey: authKey },
  });
  const payload = await parseResponse(response);
  return payload?.type === 'success';
};

export const resendOtp = async (mobile, { env = process.env, fetchImpl = fetch } = {}) => {
  const { authKey } = getConfig(env);
  const url = new URL('/api/v5/otp/retry', MSG91_BASE_URL);
  url.searchParams.set('authkey', authKey);
  url.searchParams.set('retrytype', 'text');
  url.searchParams.set('mobile', mobile);
  const response = await requestProvider(fetchImpl, url, { method: 'GET' });
  const payload = await parseResponse(response);
  if (payload?.type !== 'success') {
    throw new Msg91Error('MSG91 could not resend the OTP.');
  }
  return payload;
};
