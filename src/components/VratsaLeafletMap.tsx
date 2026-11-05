import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ReportItem } from '../types';
import { VRATSA_DISTRICTS } from '../data/mockReports';

export type LeafletLayerType = 'voyager' | 'satellite' | 'dark' | 'terrain';

interface VratsaLeafletMapProps {
  reports: ReportItem[];
  selectedReportId?: string | null;
  targetDistrict: typeof VRATSA_DISTRICTS[0] | null;
  droppedPinCoords: { lat: number; lng: number } | null;
  selectedReportCoords?: { lat: number; lng: number } | null;
  userCoords?: { lat: number; lng: number } | null;
  activeLayer?: LeafletLayerType;
  showHotspots?: boolean;
  onSelectReport: (reportId: string) => void;
  onMarkerClick: (report: ReportItem) => void;
  onMapClickNewSignal?: (coords: { lat: number; lng: number; districtName: string }) => void;
  onZoomChange?: (zoom: number) => void;
}

// Tile Layer URL Providers (Voyager styled like Google Maps Roadmap)
const TILE_PROVIDERS: Record<LeafletLayerType, { url: string; attribution: string; maxZoom: number }> = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> (Google Maps Style)',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17
  }
};

// Strict geographic bounds for Vratsa
const VRATSA_BOUNDS = L.latLngBounds(
  [43.1600, 23.4700], // Southwest (Vrattsata / Balkan)
  [43.2500, 23.6300]  // Northeast (Dabnika / Kulata / ring road)
);

export const VratsaLeafletMap: React.FC<VratsaLeafletMapProps> = ({
  reports,
  selectedReportId,
  targetDistrict,
  droppedPinCoords,
  userCoords,
  activeLayer = 'osm',
  showHotspots = false,
  onSelectReport,
  onMarkerClick,
  onMapClickNewSignal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const hotspotsGroupRef = useRef<L.LayerGroup | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [43.2047, 23.5477],
        zoom: 13.5,
        minZoom: 12.5,
        maxZoom: 18,
        maxBounds: VRATSA_BOUNDS,
        maxBoundsViscosity: 1.0, // 100% strictly locked to Vratsa only
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: 'center',
        tapHold: false
      });

      // Add active base tile layer
      const provider = TILE_PROVIDERS[activeLayer as keyof typeof TILE_PROVIDERS] || TILE_PROVIDERS.voyager;
      const tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const hotspotsGroup = L.layerGroup().addTo(map);
      hotspotsGroupRef.current = hotspotsGroup;

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      const userLocGroup = L.layerGroup().addTo(map);
      userLocationMarkerRef.current = userLocGroup;

      mapRef.current = map;

      // Invalidate size to guarantee tiles fit flex containers properly
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      // Handle map click for reporting
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        let nearestDistrict = 'Център';
        let minDistance = Infinity;

        VRATSA_DISTRICTS.forEach((d) => {
          if (d.id === 'all') return;
          const dist = Math.hypot(d.lat - lat, d.lng - lng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestDistrict = d.name;
          }
        });

        if (onMapClickNewSignal) {
          onMapClickNewSignal({ lat, lng, districtName: nearestDistrict });
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
        hotspotsGroupRef.current = null;
        userLocationMarkerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Update base tile layer on layer switcher change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[activeLayer as keyof typeof TILE_PROVIDERS] || TILE_PROVIDERS.voyager;
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Pan only when user explicitly chooses a district from the toolbar (NEVER when clicking a report!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetDistrict) return;

    if (targetDistrict.id === 'all') {
      map.panTo([43.2047, 23.5477]);
      map.setZoom(13.5);
    } else {
      map.panTo([targetDistrict.lat, targetDistrict.lng]);
      map.setZoom(targetDistrict.zoom);
    }
  }, [targetDistrict]);

  // Render User GPS Location marker with animated pulse radar
  useEffect(() => {
    const userGroup = userLocationMarkerRef.current;
    if (!userGroup) return;

    userGroup.clearLayers();

    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'user-gps-pulse-marker',
        html: `
          <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
            <div style="
              position: absolute;
              width: 32px;
              height: 32px;
              border-radius: 9999px;
              background-color: rgba(59, 130, 246, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 16px;
              height: 16px;
              border-radius: 9999px;
              background-color: #2563EB;
              border: 3px solid #FFFFFF;
              box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        title: 'Вашето текущо местоположение'
      });

      userMarker.bindTooltip('📍 Вие сте тук', {
        permanent: false,
        direction: 'top',
        className: 'bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg'
      });

      userGroup.addLayer(userMarker);
    }
  }, [userCoords]);

  // Handle dropped pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (droppedPinMarkerRef.current) {
      droppedPinMarkerRef.current.remove();
      droppedPinMarkerRef.current = null;
    }

    if (droppedPinCoords) {
      const pinIcon = L.divIcon({
        className: 'leaflet-dropped-pin-icon',
        html: `
          <div style="
            background: #10B981;
            border: 3px solid #065F46;
            color: white;
            border-radius: 9999px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 900;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.7);
            cursor: pointer;
            animation: bounce 1s infinite alternate;
          ">+</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      droppedPinMarkerRef.current = L.marker([droppedPinCoords.lat, droppedPinCoords.lng], {
        icon: pinIcon,
        title: 'Нова посочена точка за сигнал'
      }).addTo(map);
    }
  }, [droppedPinCoords]);

  // Render report markers and urgency hotspot circles
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    const hotspotsGroup = hotspotsGroupRef.current;
    if (!markersGroup || !hotspotsGroup) return;

    markersGroup.clearLayers();
    hotspotsGroup.clearLayers();

    reports.forEach((report) => {
      const lat = report.coordinates?.lat || 43.2047;
      const lng = report.coordinates?.lng || 23.5477;
      const isSelected = selectedReportId === report.id;
      const urgencyScore = report.analysis?.urgencyScore ?? 50;
      const isCritical = urgencyScore >= 80 || report.analysis?.path === 'red';

      // Hotspot circle if enabled or critical
      if (showHotspots && isCritical && report.status !== 'решен') {
        const circle = L.circle([lat, lng], {
          color: '#EF4444',
          fillColor: '#EF4444',
          fillOpacity: 0.18,
          radius: 120,
          weight: 1.5,
          dashArray: '4, 4'
        });
        hotspotsGroup.addLayer(circle);
      }

      let pinBg = '#3B82F6';
      let pinBorder = '#1D4ED8';
      let glyphText = '🔵';

      if (report.status === 'решен') {
        pinBg = '#10B981';
        pinBorder = '#047857';
        glyphText = '✓';
      } else if (report.analysis?.path === 'red') {
        pinBg = '#EF4444';
        pinBorder = '#991B1B';
        glyphText = '⚠';
      } else if (report.analysis?.path === 'yellow') {
        pinBg = '#F59E0B';
        pinBorder = '#B45309';
        glyphText = '🛠';
      }

      const size = isSelected ? 38 : isCritical ? 34 : 30;

      const markerHtml = `
        <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          ${
            isCritical && report.status !== 'решен'
              ? `<div style="
                  position: absolute;
                  inset: -6px;
                  border-radius: 9999px;
                  border: 2px solid ${pinBg};
                  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                  opacity: 0.75;
                "></div>`
              : ''
          }
          <div style="
            background-color: ${pinBg};
            border: ${isSelected ? '3px solid #FFFFFF' : `2px solid ${pinBorder}`};
            color: #FFFFFF;
            border-radius: 9999px;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '14px' : '12px'};
            font-weight: 800;
            box-shadow: ${isSelected ? '0 0 16px rgba(255,255,255,0.8)' : '0 4px 10px rgba(0,0,0,0.5)'};
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          ">
            ${glyphText}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'leaflet-custom-report-icon',
        html: markerHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        title: `${report.ticketNumber}: ${report.title}`
      });

      // Hover tooltip for instant interactivity
      const tooltipContent = `
        <div style="font-family: sans-serif; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 800; color: #FFFFFF; line-height: 1.2;">${report.ticketNumber}: ${report.title}</div>
          <div style="color: #94A3B8; font-size: 10px; margin-top: 2px;">📍 ${report.neighborhood || 'Враца'} · Наложителност: <strong style="color: ${urgencyScore >= 80 ? '#F87171' : urgencyScore >= 50 ? '#FBBF24' : '#60A5FA'}">${urgencyScore}/100</strong></div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -size / 2],
        opacity: 0.95,
        className: 'leaflet-custom-tooltip bg-slate-900 border border-slate-700 text-white rounded-lg shadow-xl'
      });

      marker.on('click', () => {
        onSelectReport(report.id);
        onMarkerClick(report);
      });

      markersGroup.addLayer(marker);
    });
  }, [reports, selectedReportId, showHotspots, onSelectReport, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full z-0 touch-pan-x touch-pan-y"
      style={{ minHeight: '100%', width: '100%' }}
    />
  );
};
