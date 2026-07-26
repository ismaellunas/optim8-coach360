import { createHmac } from 'node:crypto';

export async function postJson(url, { headers = {}, body, method = 'POST' } = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: method === 'GET' ? undefined : payload,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

/** Sanity: t=<ms>,v1=<base64url hmac> over `${t}.${rawBody}` */
export function encodeSanityWebhookSignature(rawBody, secret, timestampMs = Date.now()) {
  const digest = createHmac('sha256', secret)
    .update(`${timestampMs}.${rawBody}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `t=${timestampMs},v1=${digest}`;
}

/** Mux: t=<unix>,v1=<hex hmac> over `${t}.${rawBody}` */
export function encodeMuxWebhookSignature(rawBody, secret, timestampSec = Math.floor(Date.now() / 1000)) {
  const digest = createHmac('sha256', secret)
    .update(`${timestampSec}.${rawBody}`)
    .digest('hex');
  return `t=${timestampSec},v1=${digest}`;
}
