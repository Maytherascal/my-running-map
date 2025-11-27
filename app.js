// Full app.js with mobile fixes: marker touch handlers, popupopen, console logs, and invalidateSize call.

const { useState, useEffect, useMemo } = React;

// --- Components ---

const RaceList = ({ races, onSelectRace, completedRaces, onOpenSidebar }) => {
  return (
    <div className="race-list">
      {races.map(race => {
        const isCompleted = completedRaces[race.id];
        return (
          <div
            key={race.id}
            className={`race-card ${isCompleted ? 'completed' : ''}`}
          >
            <div className="race-header" onClick={() => { onSelectRace(race); onOpenSidebar(); }}>
              <span className="race-name">{race.name}</span>
              {isCompleted && <span className="badge">✓ Done</span>}
            </div>
            <div className="race-details">
              <span>📅 {race.date}</span>
              <span>📍 {race.location}</span>
              <span>🏃 {race.distance}</span>
            </div>
            <button
              className="action-btn btn-view"
              onClick={() => { onSelectRace(race); onOpenSidebar(); }}
            >
              View Details
            </button>
          </div>
        );
      })}
    </div>
  );
};

const RaceMap = ({ races, selectedRace, onSelectRace, onOpenSidebar, completedRaces }) => {
  // Initialize map
  useEffect(() => {
    // Prevent duplicate map instances
    if (window.mapInstance) {
      try { window.mapInstance.remove(); } catch (e) {}
      window.mapInstance = null;
      window.markers = null;
    }

    // Check container exists
    if (!document.getElementById('map')) return;

    const map = L.map('map', {
      minZoom: 2,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0
    }).setView([39.8283, -98.5795], 4); // Center of USA

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(map);

    // Add markers
    const markers = [];
    races.forEach(race => {
      const isCompleted = completedRaces[race.id];
      const color = isCompleted ? '#22c55e' : '#38bdf8';

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
        "></div>
      `;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = L.marker([race.lat, race.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${race.name}</b><br>${race.location}`);

      // Handler used for click/tap/popupopen
      const openSidebarHandler = () => {
        // debug log to help mobile remote debugging
        console.log('marker tapped', race.id);
        onSelectRace(race);
        onOpenSidebar();
        // ensure map layout adjusts after sidebar opens
        setTimeout(() => {
          try { map.invalidateSize(); } catch (e) {}
        }, 300);
      };

      // Listen for both click and touchstart (mobile)
      marker.on('click', openSidebarHandler);
      marker.on('touchstart', openSidebarHandler);
      // Also open sidebar when popup opens (some touch flows)
      marker.on('popupopen', openSidebarHandler);

      markers.push({ id: race.id, marker });
    });

    // Store map instance on window for cleanup/access if needed
    window.mapInstance = map;
    window.markers = markers;

    return () => {
      if (window.mapInstance) {
        window.mapInstance.remove();
        window.mapInstance = null;
      }
    };
  }, [races, completedRaces, onSelectRace, onOpenSidebar]);

  // Update markers when completedRaces changes (colors)
  useEffect(() => {
    if (window.markers) {
      window.markers.forEach(({ id, marker }) => {
        const isCompleted = completedRaces[id];
        const color = isCompleted ? '#22c55e' : '#38bdf8';
        const markerHtml = `
          <div style="
            background-color: ${color};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
          "></div>
        `;
        const icon = L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        marker.setIcon(icon);
      });
    }
  }, [completedRaces]);

  // Fly to selected race
  useEffect(() => {
    if (selectedRace && window.mapInstance) {
      window.mapInstance.flyTo([selectedRace.lat, selectedRace.lng], 10);

      const markerObj = window.markers && window.markers.find(m => m.id === selectedRace.id);
      if (markerObj) {
        markerObj.marker.openPopup();
      }
    }
  }, [selectedRace]);

  return <div id="map" style={{ height: '
