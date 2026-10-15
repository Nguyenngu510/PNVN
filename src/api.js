import { API_BASE } from './config.js';
export { API_BASE };

export async function api(endpoint, { method = 'GET', body = null, headers: customHeaders = {}, ...extraOpts } = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Client': 'Card2010_FE',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = {
    method,
    headers,
    ...extraOpts
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(`${API_BASE}${endpoint}`, opts);
  if (!resp.ok) {
    let errMessage = `Yêu cầu thất bại (${resp.status})`;
    try {
      const errJson = await resp.json();
      if (errJson && errJson.message) {
        errMessage = errJson.message;
      }
    } catch {
      const txt = await resp.text();
      if (txt) errMessage = txt;
    }
    throw new Error(errMessage);
  }

  if (resp.status === 204) return null;
  return resp.json();
}
