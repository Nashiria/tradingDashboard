export const parseCookies = (cookieHeader?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) {
    return cookies;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=');

    if (key && value) {
      cookies[key.trim()] = value.trim();
    }
  }

  return cookies;
};
