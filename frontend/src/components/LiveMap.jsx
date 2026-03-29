import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';

const MAX_VISIBLE_ARCS = 120;
const MAX_VISIBLE_POINTS = 240;
const MAX_RING_PULSES = 40;
const DEFAULT_ARC_COLOR = 'rgba(255, 0, 85, 0.8)';

function escapeHtml(value) {
  return `${value ?? ''}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildLocationLabel(city, country, ip) {
  return [city, country, ip].filter(Boolean).join(' | ') || 'Unknown';
}

function buildArcLabel(arc) {
  const source = buildLocationLabel(arc.sourceCity, arc.sourceCountry, arc.sourceIp);
  const target = buildLocationLabel(arc.targetCity, arc.targetCountry, arc.targetIp);

  return `
    <div style="padding:6px 8px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; line-height:1.4;">
      <div style="font-size:12px; color:#9ca3af;">${escapeHtml(source)} -> ${escapeHtml(target)}</div>
      <div style="font-weight:700; color:#f3f4f6;">${escapeHtml(arc.threatType || 'Attack')}</div>
      <div style="font-size:11px; color:#67e8f9;">Severity: ${escapeHtml(arc.severity || 'Medium')}</div>
      <div style="font-size:11px; color:#a1a1aa;">${escapeHtml(arc.timestamp || 'Live')}</div>
    </div>
  `;
}

function toSourcePoint(arc) {
  return {
    key: `s-${arc.startLat}-${arc.startLng}-${arc.sourceCountry || 'u'}`,
    lat: arc.startLat,
    lng: arc.startLng,
    color: 'rgba(34, 211, 238, 0.9)',
    altitude: 0.02,
    radius: 0.14,
    label: buildLocationLabel(arc.sourceCity, arc.sourceCountry, arc.sourceIp),
  };
}

function toTargetPoint(arc) {
  return {
    key: `t-${arc.endLat}-${arc.endLng}-${arc.targetCountry || 'u'}`,
    lat: arc.endLat,
    lng: arc.endLng,
    color: 'rgba(255, 0, 85, 0.92)',
    altitude: 0.02,
    radius: 0.16,
    label: buildLocationLabel(arc.targetCity, arc.targetCountry, arc.targetIp),
  };
}

function makeRingPulse(arc, idx) {
  return {
    id: `${arc.id || 'threat'}-${idx}`,
    lat: arc.endLat,
    lng: arc.endLng,
    color: arc.color || DEFAULT_ARC_COLOR,
    maxRadius: 4.5,
    repeatPeriod: 900,
  };
}

/**
 * LiveMap Component
 * 3D Interactive Globe with cyber-themed visualized attack traffic
 */
function LiveMap({ arcsData }) {
  const globeContainerRef = useRef(null);
  const globeRef = useRef(null);
  const [hoveredThreat, setHoveredThreat] = useState(null);

  const visibleArcs = useMemo(() => arcsData.slice(-MAX_VISIBLE_ARCS), [arcsData]);

  const visiblePoints = useMemo(() => {
    const map = new Map();

    visibleArcs.forEach((arc) => {
      const source = toSourcePoint(arc);
      const target = toTargetPoint(arc);

      if (!map.has(source.key)) map.set(source.key, source);
      if (!map.has(target.key)) map.set(target.key, target);
    });

    return Array.from(map.values()).slice(-MAX_VISIBLE_POINTS);
  }, [visibleArcs]);

  const ringPulses = useMemo(
    () => visibleArcs.slice(-MAX_RING_PULSES).map((arc, idx) => makeRingPulse(arc, idx)),
    [visibleArcs]
  );

  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return undefined;

    try {
      const globe = Globe()(container);

      globe
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#22d3ee')
        .atmosphereAltitude(0.2)
        .arcColor((arc) => arc.color || DEFAULT_ARC_COLOR)
        .arcDashLength(() => 0.33)
        .arcDashGap(() => 0.2)
        .arcDashAnimateTime(() => 1300)
        .arcStroke(() => 1.8)
        .arcAltitude((arc) => arc.arcAltitude ?? 0.2)
        .arcLabel(buildArcLabel)
        .onArcHover((arc) => {
          setHoveredThreat(arc || null);
        })
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude('altitude')
        .pointRadius('radius')
        .pointLabel('label')
        .pointsMerge(true)
        .ringsData([])
        .ringLat('lat')
        .ringLng('lng')
        .ringColor('color')
        .ringMaxRadius('maxRadius')
        .ringPropagationSpeed(() => 1.3)
        .ringRepeatPeriod('repeatPeriod')
        .arcsData([]);

      try {
        globe
          .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
          .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png');
      } catch {
        // Globe can still render without textures.
      }

      const globeMaterial = globe.globeMaterial();
      if (globeMaterial instanceof THREE.MeshPhongMaterial) {
        globeMaterial.color = new THREE.Color('#091426');
        globeMaterial.emissive = new THREE.Color('#08203b');
        globeMaterial.emissiveIntensity = 0.35;
        globeMaterial.shininess = 8;
      }

      const controls = typeof globe.controls === 'function' ? globe.controls() : null;
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.42;
        controls.enablePan = false;
        controls.minDistance = 180;
        controls.maxDistance = 420;
      }

      const camera = typeof globe.camera === 'function' ? globe.camera() : null;
      if (camera?.position) {
        camera.position.z = 280;
      }

      globeRef.current = globe;
    } catch {
      container.innerHTML = `
        <div style="width:100%; height:100%; background: linear-gradient(135deg, #050511 0%, #0f0f23 50%, #1a0033 100%); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:20px; color:#00ffff; font-family:monospace; overflow:hidden;">
          <svg width="120" height="120" viewBox="0 0 120 120" style="filter:drop-shadow(0 0 10px #00ffff);">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ff0055" stroke-width="2" opacity="0.3"/>
            <circle cx="60" cy="60" r="45" fill="none" stroke="#00ffff" stroke-width="1" opacity="0.2"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#ff0055" stroke-width="1" opacity="0.1" />
            <line x1="10" y1="60" x2="40" y2="60" stroke="#ff0055" stroke-width="2" opacity="0.6"/>
            <line x1="80" y1="60" x2="110" y2="60" stroke="#ff0055" stroke-width="2" opacity="0.6"/>
            <circle cx="60" cy="60" r="8" fill="#00ffff" opacity="0.8"/>
          </svg>
          <div style="font-size:16px; font-weight:bold; text-align:center; max-width:300px;">
            <div>THREAT INTELLIGENCE MAP</div>
            <div style="font-size:12px; color:#00ffff80; margin-top:10px;">WebGL Rendering System Active</div>
          </div>
        </div>
      `;
    }

    return () => {
      const globe = globeRef.current;
      if (globe) {
        try {
          if (typeof globe.pauseAnimation === 'function') {
            globe.pauseAnimation();
          }
          if (typeof globe._destructor === 'function') {
            globe._destructor();
          }
        } catch {
          // Ignore teardown errors.
        }
      }

      globeRef.current = null;
      setHoveredThreat(null);

      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.arcsData(visibleArcs);
    globe.pointsData(visiblePoints);
    globe.ringsData(ringPulses);
  }, [visibleArcs, visiblePoints, ringPulses]);

  return (
    <>
      <div
        ref={globeContainerRef}
        className="globe-container"
        style={{
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(ellipse at center, rgba(12, 23, 45, 0.95) 0%, rgba(5, 5, 17, 1) 58%, rgba(2, 2, 8, 1) 100%)',
        }}
      />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute -top-24 left-[-120px] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-28 right-[-90px] h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      {hoveredThreat && (
        <div className="absolute left-6 bottom-6 z-20 pointer-events-none max-w-sm rounded-lg border border-cyan-500/30 bg-[#050511cc] px-3 py-2">
          <p className="text-xs text-cyan-300 font-mono">
            {[hoveredThreat.sourceCity, hoveredThreat.sourceCountry, hoveredThreat.sourceIp].filter(Boolean).join(' | ') ||
              'Unknown'}{' '}
            -&gt;{' '}
            {[hoveredThreat.targetCity, hoveredThreat.targetCountry, hoveredThreat.targetIp].filter(Boolean).join(' | ') ||
              'Unknown'}
          </p>
          <p className="text-xs text-gray-100 mt-1">{hoveredThreat.threatType || 'Attack'}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Severity: {hoveredThreat.severity || 'Medium'} | {hoveredThreat.timestamp || 'Live'}
          </p>
        </div>
      )}
    </>
  );
}

export default LiveMap;
