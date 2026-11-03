const CLOUDSHOPE_CALL_URL = 'https://cloudshope.com/api/v1/outboundCallApis/outboundCallQr';

export class CloudshopeCallError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'CloudshopeCallError';
    this.statusCode = statusCode;
  }
}

export const normalizeCloudshopeMobile = (phoneNumber) => {
  const mobile = String(phoneNumber || '').replace(/\D/g, '');
  if (mobile.length < 10 || mobile.length > 15) {
    throw new CloudshopeCallError('The emergency contact has an invalid phone number.', 400);
  }
  return mobile;
};

export const requestMaskedCallNumber = async (
  phoneNumber,
  { env = process.env, fetchImpl = fetch } = {}
) => {
  const token = env.CLOUDSHOPE_API_TOKEN?.trim();
  if (!token) {
    throw new CloudshopeCallError('Call masking is not configured.', 503);
  }

  const mobileNumber = normalizeCloudshopeMobile(phoneNumber);
  let response;
  try {
    response = await fetchImpl(CLOUDSHOPE_CALL_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mobile_number: mobileNumber }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new CloudshopeCallError('Cloudshope could not be reached or timed out.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new CloudshopeCallError('Cloudshope returned an invalid response.');
  }

  if (!response.ok) {
    throw new CloudshopeCallError(`Cloudshope request failed (HTTP ${response.status}).`);
  }

  const did = payload?.data?.did;
  if (
    ![200, '200'].includes(payload?.status) ||
    typeof did !== 'string' ||
    !/^\d{5,20}$/.test(did)
  ) {
    throw new CloudshopeCallError('Cloudshope did not return a valid masked number.');
  }

  return did;
};
