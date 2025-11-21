const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NX_API_BASE ||
  'http://localhost:3001'; // adjust if your backend runs elsewhere

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    // if you later use cookie-based auth, keep credentials: 'include'
    credentials = 'include',
  } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
    credentials,
  });

  if (!res.ok) {
    // Try to extract a useful message
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.message) {
        message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export { request };