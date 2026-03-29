import { io } from 'socket.io-client';

const DEFAULT_API_BASE_URL = 'http://localhost:5000';

function normalizeBaseUrl(value, fallback) {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return fallback;
  return input.replace(/\/+$/, '');
}

function readEventEnv(name, fallback) {
  const value = import.meta.env[name];
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      return value;
    }
  }
  return null;
}

function asCoordinate(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function normalizeSeverity(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (text === 'critical') return 'Critical';
  if (text === 'high') return 'High';
  if (text === 'low') return 'Low';
  return 'Medium';
}

function severityColor(severity) {
  if (severity === 'Critical') return 'rgba(239, 68, 68, 0.85)';
  if (severity === 'High') return 'rgba(249, 115, 22, 0.8)';
  if (severity === 'Medium') return 'rgba(234, 179, 8, 0.8)';
  return 'rgba(59, 130, 246, 0.8)';
}

function arcAltitude(severity) {
  if (severity === 'Critical') return 0.3;
  if (severity === 'High') return 0.26;
  if (severity === 'Medium') return 0.22;
  return 0.18;
}

function normalizeThreatEvent(event) {
  if (!event) return null;

  const source = typeof event.source === 'object' && event.source ? event.source : {};
  const target = typeof event.target === 'object' && event.target ? event.target : {};

  const startLat = asCoordinate(
    firstDefined(event.startLat, event.start_lat, event.sourceLat, event.source_lat, source.lat, source.latitude),
    -90,
    90
  );
  const startLng = asCoordinate(
    firstDefined(event.startLng, event.start_lng, event.sourceLng, event.source_lng, source.lng, source.longitude),
    -180,
    180
  );
  const endLat = asCoordinate(
    firstDefined(event.endLat, event.end_lat, event.targetLat, event.target_lat, target.lat, target.latitude),
    -90,
    90
  );
  const endLng = asCoordinate(
    firstDefined(event.endLng, event.end_lng, event.targetLng, event.target_lng, target.lng, target.longitude),
    -180,
    180
  );

  if (startLat === null || startLng === null || endLat === null || endLng === null) {
    return null;
  }

  const severity = normalizeSeverity(firstDefined(event.severity, event.level, event.threat_level, source.severity));

  return {
    id: firstDefined(event.id, event.threat_id, event.event_id, `${Date.now()}`),
    startLat,
    startLng,
    endLat,
    endLng,
    sourceCountry: firstDefined(event.sourceCountry, event.source_country, source.country, 'Unknown'),
    sourceCity: firstDefined(event.sourceCity, event.source_city, source.city, ''),
    sourceIp: firstDefined(event.sourceIp, event.source_ip, source.ip, source.ip_address, ''),
    targetCountry: firstDefined(event.targetCountry, event.target_country, target.country, 'Unknown'),
    targetCity: firstDefined(event.targetCity, event.target_city, target.city, ''),
    targetIp: firstDefined(event.targetIp, event.target_ip, target.ip, target.ip_address, ''),
    threatType: firstDefined(event.threatType, event.threat_type, event.type, 'Attack'),
    severity,
    color: firstDefined(event.color, severityColor(severity)),
    timestamp: firstDefined(event.timestamp, event.created_at, 'Live'),
    arcAltitude: arcAltitude(severity),
  };
}

const SOCKET_URL = normalizeBaseUrl(
  import.meta.env.VITE_SOCKET_URL,
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

const SOCKET_EVENTS = {
  requestThreatData: readEventEnv('VITE_SOCKET_EVENT_REQUEST_THREATS', 'request_threat_data'),
  threat: readEventEnv('VITE_SOCKET_EVENT_THREAT', 'new_threat'),
  threatBatch: readEventEnv('VITE_SOCKET_EVENT_THREAT_BATCH', 'threat_data'),
};

const SOCKET_OPTIONS = {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ['websocket'],
  upgrade: false,
};

let socket;

function ensureSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, SOCKET_OPTIONS);
  }
  return socket;
}

function toThreatArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.threats)) return payload.threats;
  if (Array.isArray(payload?.events)) return payload.events;
  return [];
}

export function subscribeToThreats({ onThreat, onConnect, onDisconnect, onError }) {
  const client = ensureSocket();

  const handleConnect = () => {
    if (onConnect) onConnect();
    client.emit(SOCKET_EVENTS.requestThreatData);
  };

  const handleDisconnect = () => {
    if (onDisconnect) onDisconnect();
  };

  const handleThreat = (payload) => {
    const normalized = normalizeThreatEvent(payload);
    if (normalized && onThreat) {
      onThreat(normalized);
    }
  };

  const handleThreatBatch = (payload) => {
    const threats = toThreatArray(payload);
    threats.forEach(handleThreat);
  };

  const handleError = (error) => {
    if (onError) onError(error);
  };

  client.on('connect', handleConnect);
  client.on('disconnect', handleDisconnect);
  client.on(SOCKET_EVENTS.threat, handleThreat);
  client.on(SOCKET_EVENTS.threatBatch, handleThreatBatch);
  client.on('connect_error', handleError);
  client.on('error', handleError);

  return () => {
    client.off('connect', handleConnect);
    client.off('disconnect', handleDisconnect);
    client.off(SOCKET_EVENTS.threat, handleThreat);
    client.off(SOCKET_EVENTS.threatBatch, handleThreatBatch);
    client.off('connect_error', handleError);
    client.off('error', handleError);
  };
}

export function disconnectThreatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
