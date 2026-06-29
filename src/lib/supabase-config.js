function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function isIpHostname(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function validateSupabaseEnv(url, key, keyName) {
  if (!url || !key) {
    throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL or ${keyName}`);
  }

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }

  if (isIpHostname(hostname)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (for example, https://YOUR_PROJECT_REF.supabase.co), not a raw IP address.'
    );
  }

  const payload = decodeJwtPayload(key);
  const projectRef = payload?.ref;
  if (projectRef && !hostname.includes(projectRef)) {
    throw new Error(
      `Supabase URL/key mismatch: URL host "${hostname}" does not match the project ref "${projectRef}" embedded in ${keyName}.`
    );
  }
}
