import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DonationStatus } from '../../types';
import { getDeliveryRouteCoordinates, getDeliveryStepInfo } from '../../utils/deliveryStepMapping';

export interface DeliveryRouteMapProps {
  donorLat?: number | null;
  donorLng?: number | null;
  donorName?: string;
  ngoLat?: number | null;
  ngoLng?: number | null;
  ngoName?: string;
  status: DonationStatus;
  className?: string;
}

/**
 * DeliveryRouteMap
 * Lazy-loadable Leaflet map rendering a live transit route.
 *
 * Rules:
 * - Dashed polyline from donor lat/lng to NGO lat/lng.
 * - Marker position dynamically matches status (at donor when assigned, midpoint when picked_up, NGO when delivered).
 * - If lat/lng are missing on either side, returns null - never invents fake coordinates.
 * - Respects prefers-reduced-motion.
 */
export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  donorLat,
  donorLng,
  donorName = 'Donor Kitchen',
  ngoLat,
  ngoLng,
  ngoName = 'NGO Distribution Center',
  status,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const routeCoords = getDeliveryRouteCoordinates(donorLat, donorLng, ngoLat, ngoLng, status);

  useEffect(() => {
    // If coordinates are missing on either side, don't initialize Leaflet
    if (!mapContainerRef.current || !routeCoords) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: routeCoords.donor,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // Warm, muted CartoDB Voyager tiles matching brand tone
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routeCoords !== null]);

  // Update map contents when coordinates or status changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers || !routeCoords) return;

    layers.clearLayers();

    const stepInfo = getDeliveryStepInfo(status);

    // 1. Dashed polyline route between donor and NGO
    const polyline = L.polyline([routeCoords.donor, routeCoords.ngo], {
      color: '#C77A54',
      weight: 4,
      dashArray: '6, 8',
      opacity: 0.85,
    });
    layers.addLayer(polyline);

    // Helper for pin icons using theme colors
    const createWaypointIcon = (color: string, label: string) => {
      const svg = `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="11" fill="${color}" stroke="#FFFFFF" stroke-width="2.5" />
          <circle cx="14" cy="14" r="4" fill="#FFFFFF" />
        </svg>
      `;
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));" title="${label}">${svg}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    };

    // Helper for dynamic courier vehicle marker
    const createCourierIcon = () => {
      const svg = `
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="17" r="15" fill="#647C50" stroke="#FFFFFF" stroke-width="2.5" />
          <path d="M10 18h2m8 0h4m-12 0a2 2 0 104 0m-4 0a2 2 0 114 0m8 0a2 2 0 104 0m-4 0a2 2 0 114 0M8 12h11v6H8zm11 2h4l2 2v2h-6z" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(24,61,43,0.35)); cursor:pointer;" title="Courier">${svg}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    };

    // Donor Waypoint Marker (Forest Green #183D2B)
    const donorMarker = L.marker(routeCoords.donor, {
      icon: createWaypointIcon('#183D2B', donorName),
    }).bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:2px;">
        <span style="font-size:10px;text-transform:uppercase;color:#647C50;font-weight:700;">Pickup Location</span>
        <h4 style="font-family:'Playfair Display',serif;font-size:14px;color:#183D2B;margin:2px 0 0 0;font-weight:700;">${donorName}</h4>
      </div>
    `);
    layers.addLayer(donorMarker);

    // NGO Waypoint Marker (Terracotta #C77A54)
    const ngoMarker = L.marker(routeCoords.ngo, {
      icon: createWaypointIcon('#C77A54', ngoName),
    }).bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:2px;">
        <span style="font-size:10px;text-transform:uppercase;color:#C77A54;font-weight:700;">Drop-off Location</span>
        <h4 style="font-family:'Playfair Display',serif;font-size:14px;color:#183D2B;margin:2px 0 0 0;font-weight:700;">${ngoName}</h4>
      </div>
    `);
    layers.addLayer(ngoMarker);

    // Dynamic Courier Marker (Olive #647C50)
    const courierMarker = L.marker(routeCoords.courier, {
      icon: createCourierIcon(),
      zIndexOffset: 500,
    }).bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;padding:2px;">
        <span style="font-size:10px;text-transform:uppercase;color:#183D2B;font-weight:700;">Courier Tracker</span>
        <h4 style="font-size:13px;color:#183D2B;margin:2px 0 0 0;font-weight:700;">${stepInfo.stepLabel}</h4>
        <p style="font-size:11px;color:#50544C;margin:2px 0 0 0;">Phase: ${stepInfo.courierLocationPhase === 'donor' ? 'At Collection Point' : stepInfo.courierLocationPhase === 'midpoint' ? 'En Route to Shelter' : 'At NGO Facility'}</p>
      </div>
    `);
    layers.addLayer(courierMarker);

    // Fit bounds to show both points and courier cleanly
    const bounds = L.latLngBounds([routeCoords.donor, routeCoords.ngo, routeCoords.courier]);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [routeCoords, status, donorName, ngoName]);

  // If coordinates are missing on either side, render nothing (render stepper only)
  if (!routeCoords) {
    return null;
  }

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-[#E8EDE2] rounded-lg overflow-hidden border border-[#E2DFD2] shadow-2xs ${className}`}
      role="region"
      aria-label="Delivery route map showing transit path from donor to NGO facility"
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Route Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded text-[10px] sm:text-[11px] shadow-xs border border-[#E2DFD2] flex items-center gap-2.5 pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#183D2B]" aria-hidden="true" />
          <span className="text-[#252923]">Kitchen</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#647C50]" aria-hidden="true" />
          <span className="text-[#252923]">Courier</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#C77A54]" aria-hidden="true" />
          <span className="text-[#252923]">Shelter</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRouteMap;
