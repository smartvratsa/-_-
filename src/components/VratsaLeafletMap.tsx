import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ReportItem } from '../types';
import { VRATSA_DISTRICTS } from '../data/mockReports';

interface VratsaLeafletMapProps {
  reports: ReportItem[];
  selectedReportId?: string | null;
  targetDistrict: typeof VRATSA_DISTRICTS[0] | null;
  selectedReportCoords: { lat: number; lng: number } | null;
  droppedPinCoords: { lat: number; lng: number } | null;
  onSelectReport: (reportId: string) => void;
  onMarkerClick: (report: ReportItem) => void;
  onMapClickNewSignal?: (coords: { lat: number; lng: number; districtName: string }) => void;
}

export const VratsaLeafletMap: React.FC<VratsaLeafletMapProps> = ({
  reports,
  selectedReportId,
  targetDistrict,
  selectedReportCoords,
  droppedPinCoords,
  onSelectReport,
  onMarkerClick,
  onMapClickNewSignal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [43.2047, 23.5477],
        zoom: 13.5,
        zoomControl: true,
        attributionControl: true
      });

      // Standard OpenStreetMap Carto / OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapRef.current = map;

      // Invalidate size to guarantee tiles fit flex containers
      setTimeout(() => {
        map.invalidateSize();
      }, 200);

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
      }
    };
  }, []);

  // Pan to selected report or district
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedReportCoords) {
      map.flyTo([selectedReportCoords.lat, selectedReportCoords.lng], 16, { animate: true });
    } else if (targetDistrict && targetDistrict.id !== 'all') {
      map.flyTo([targetDistrict.lat, targetDistrict.lng], targetDistrict.zoom, { animate: true });
    }
  }, [targetDistrict, selectedReportCoords]);

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
            border: 2px solid #065F46;
            color: white;
            border-radius: 9999px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            cursor: pointer;
            animation: bounce 1s infinite alternate;
          ">+</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      droppedPinMarkerRef.current = L.marker([droppedPinCoords.lat, droppedPinCoords.lng], {
        icon: pinIcon,
        title: 'Нова локация за сигнал'
      }).addTo(map);
    }
  }, [droppedPinCoords]);

  // Render report markers
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    reports.forEach((report) => {
      const lat = report.coordinates?.lat || 43.2047;
      const lng = report.coordinates?.lng || 23.5477;
      const isSelected = selectedReportId === report.id;

      let pinBg = '#3B82F6';
      let pinBorder = '#1D4ED8';
      let glyphText = '🔵';

      if (report.status === 'решен') {
        pinBg = '#10B981';
        pinBorder = '#047857';
        glyphText = '✓';
      } else if (report.analysis?.path === 'red') {
        pinBg = '#EF4444';
        pinBorder = '#B91C1C';
        glyphText = '⚠';
      } else if (report.analysis?.path === 'yellow') {
        pinBg = '#F59E0B';
        pinBorder = '#B45309';
        glyphText = '🛠';
      }

      const size = isSelected ? 36 : 28;

      const markerIcon = L.divIcon({
        className: 'leaflet-custom-report-icon',
        html: `
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
            font-size: ${isSelected ? '13px' : '11px'};
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            ${glyphText}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        title: `${report.ticketNumber}: ${report.title}`
      });

      marker.on('click', () => {
        onSelectReport(report.id);
        onMarkerClick(report);
      });

      markersGroup.addLayer(marker);
    });
  }, [reports, selectedReportId, onSelectReport, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full z-0"
      style={{ minHeight: '100%', width: '100%' }}
    />
  );
};
