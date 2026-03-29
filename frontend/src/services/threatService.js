const DEFAULT_API_BASE_URL = 'http://localhost:5000';
const DEFAULT_TIMEOUT_MS = 45000;

function normalizeBaseUrl(value, fallback) {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return fallback;
  return input.replace(/\/+$/, '');
}

function readPathEnv(name, fallback) {
  const value = import.meta.env[name];
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function parseTimeout(value, fallback = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL);
const API_TIMEOUT_MS = parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS);
const API_PATHS = {
  topThreats: readPathEnv('VITE_API_PATH_TOP_THREATS', '/api/threats/top'),
  vulnerabilities: readPathEnv('VITE_API_PATH_VULNERABILITIES', '/api/vulnerabilities'),
};

function asArray(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  return [];
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSeverity(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (text === 'critical') return 'Critical';
  if (text === 'high') return 'High';
  if (text === 'low') return 'Low';
  return 'Medium';
}

function normalizeTopThreats(payload) {
  const threats = asArray(payload, 'threats', 'top_threats', 'items');

  return threats.map((item) => ({
    country: item?.country || item?.sourceCountry || item?.source_country || 'Unknown',
    ips: `${item?.ips ?? item?.ip_count ?? item?.count ?? 0}`,
    percentage: Math.max(0, Math.min(100, asNumber(item?.percentage ?? item?.percent, 0))),
  }));
}

function normalizeSeveritySummary(payload) {
  const items = asArray(payload, 'vulnerabilities', 'threats');
  const counts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  items.forEach((item) => {
    const severity = normalizeSeverity(item?.severity || item?.threat_level || item?.level);
    counts[severity] += asNumber(item?.count, 1);
  });

  return ['Critical', 'High', 'Medium', 'Low'].map((severity) => ({
    id: severity,
    severity,
    count: counts[severity],
  }));
}

async function fetchJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out while contacting backend.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTopThreats() {
  try {
    const payload = await fetchJson(API_PATHS.topThreats);
    return normalizeTopThreats(payload);
  } catch (error) {
    throw new Error(error?.message || 'Failed to load top threats.');
  }
}

export async function fetchSeveritySummary() {
  try {
    const payload = await fetchJson(API_PATHS.vulnerabilities);
    return normalizeSeveritySummary(payload);
  } catch (error) {
    throw new Error(error?.message || 'Failed to load vulnerability summary.');
  }
}
