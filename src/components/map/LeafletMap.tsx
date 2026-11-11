import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FoodDonation } from '../../types';

interface LeafletMapProps {
  donations: FoodDonation[];
  selectedDonationId?: string;
  onSelectDonation?: (donationId: string) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showRouteForDonation?: FoodDonation | null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  donations,
  selectedDonationId,
  onSelectDonation,
  centerLat = 19.0760,
  centerLng = 72.8777,
  zoom = 13,
  showRouteForDonation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Warm, muted OpenStreetMap CartoDB Positron tiles for clean editorial look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
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
  }, []);

  // Update markers and route when donations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Helper for custom SVG pin
    const createPinIcon = (color: string, label: string, isSelected: boolean) => {
      const size = isSelected ? 38 : 30;
      const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="#FFFFFF" stroke-width="2.5" />
          <circle cx="16" cy="16" r="5" fill="#FFFFFF" />
        </svg>
      `;
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25)); cursor:pointer;" title="${label}">${svg}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    const bounds = L.latLngBounds([]);

    donations.forEach((donation) => {
      const isSelected = donation.id === selectedDonationId;
      const pinColor = donation.status === 'available' ? '#183D2B' : '#C77A54';

      const marker = L.marker([donation.donorLat, donation.donorLng], {
        icon: createPinIcon(pinColor, donation.foodName, isSelected),
      });

      const effectiveKg = donation.quantity.pickupConfirmedKg || donation.quantity.measuredKg || donation.quantity.donorEstimatedKg;

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; min-width: 200px; padding: 2px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #647C50; margin: 0 0 2px 0;">
            ${donation.donorType} · ${donation.status.toUpperCase()}
          </p>
          <h4 style="font-family: 'Playfair Display', serif; font-size: 16px; font-weight: bold; color: #183D2B; margin: 0 0 4px 0;">
            ${donation.foodName}
          </h4>
          <p style="color: #50544C; margin: 0 0 8px 0; font-size: 12px;">
            ${donation.donorName}
          </p>
          <div style="display: flex; gap: 8px; font-size: 11px; color: #252923; margin-bottom: 8px; border-top: 1px solid #E2DFD2; padding-top: 6px;">
            <span><strong>${effectiveKg} kg</strong> surplus</span>
            <span>·</span>
            <span>~${donation.quantity.servingsEstimate} meals</span>
          </div>
          <p style="margin: 0; font-size: 11px; color: #647C50;">
            Holding: ${donation.safety.storageCondition.replace('_', ' ')} (${donation.safety.temperatureCelsius || '--'}°C)
          </p>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectDonation) onSelectDonation(donation.id);
      });

      markersLayer.addLayer(marker);
      bounds.extend([donation.donorLat, donation.donorLng]);
    });

    // Render delivery route polyline if a donation with NGO coordinates is selected
    if (showRouteForDonation && showRouteForDonation.ngoLat && showRouteForDonation.ngoLng) {
      const latlngs: [number, number][] = [
        [showRouteForDonation.donorLat, showRouteForDonation.donorLng],
        [showRouteForDonation.ngoLat, showRouteForDonation.ngoLng],
      ];

      const routeLine = L.polyline(latlngs, {
        color: '#C77A54',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.9,
      }).addTo(map);

      // Add recipient NGO marker
      const ngoMarker = L.marker([showRouteForDonation.ngoLat, showRouteForDonation.ngoLng], {
        icon: createPinIcon('#C77A54', showRouteForDonation.reservedByNgoName || 'NGO Recipient', true),
      }).bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px;">
          <p style="font-size: 10px; color: #C77A54; text-transform: uppercase; font-weight: bold;">Destination Facility</p>
          <h4 style="font-size: 15px; font-weight: bold; color: #183D2B; margin: 2px 0;">${showRouteForDonation.reservedByNgoName || 'Community Kitchen'}</h4>
          <p style="font-size: 12px; color: #50544C; margin: 0;">${showRouteForDonation.ngoAddress || ''}</p>
        </div>
      `);
      markersLayer.addLayer(ngoMarker);

      routeLayerRef.current = routeLine;
      bounds.extend([showRouteForDonation.ngoLat, showRouteForDonation.ngoLng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.isValid() && donations.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [donations, selectedDonationId, showRouteForDonation]);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-[#E8EDE2] rounded-lg overflow-hidden border border-[#E2DFD2] shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-xs px-3 py-2 rounded text-[11px] shadow-sm border border-[#E2DFD2] flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#183D2B]"></span>
          <span className="text-[#252923]">Available Surplus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C77A54]"></span>
          <span className="text-[#252923]">Reserved / Active Run</span>
        </div>
      </div>
    </div>
  );
};
