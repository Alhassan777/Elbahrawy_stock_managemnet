const BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.error === 'Invalid or expired token') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    throw data;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw data;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

export const api = {
  login: (staff_id, pin) =>
    request('/staff/login', { method: 'POST', body: JSON.stringify({ staff_id, pin }) }),

  setPin: (new_pin, confirm_pin, token) =>
    request('/staff/set-pin', { method: 'POST', body: JSON.stringify({ new_pin, confirm_pin }) }, token),

  getUnits: (params, token) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/units?${qs}`, {}, token);
  },

  getUnit: (id, token) => request(`/units/${id}`, {}, token),

  getUnitQrUrl: (id) => `${BASE_URL}/units/${id}/qr`,

  getUnitTransactions: (id, token) => request(`/units/${id}/transactions`, {}, token),

  createUnit: (data, token) =>
    request('/units', { method: 'POST', body: JSON.stringify(data) }, token),

  sellUnit: (id, notes, token) =>
    request(`/units/${id}/sell`, { method: 'PATCH', body: JSON.stringify({ notes }) }, token),

  getStaff: (token) => request('/staff', {}, token),

  createStaff: (data, token) =>
    request('/staff', { method: 'POST', body: JSON.stringify(data) }, token),

  resetStaffPin: (id, token) =>
    request(`/staff/${id}/reset-pin`, { method: 'PATCH' }, token),

  deleteStaff: (id, token) =>
    request(`/staff/${id}`, { method: 'DELETE' }, token),

  getTransactions: (params, token) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions?${qs}`, {}, token);
  },
};
