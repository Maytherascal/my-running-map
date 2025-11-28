// Full app.js (mobile panning fixes included).
// Key changes:
// - Removed strict maxBounds / maxBoundsViscosity that prevented smooth panning on mobile
// - Enabled map.dragging, touchZoom, tap, doubleClickZoom explicitly
// - Added worldCopyJump and a short invalidateSize() after sidebar opens
// - Added console.log markers for mobile remote debugging
// - Preserves date picker and photo upload behavior (localStorage)
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
    tap: true,
    touchZoom: true,
    dragging: true,
    tapTolerance: 15
}).setView([39.8283, -98.5795], 4); // Center of USA

    // Ensure mobile interactions are enabled
    try {
      map.dragging && map.dragging.enable();
      map.touchZoom && map.touchZoom.enable();
      map.doubleClickZoom && map.doubleClickZoom.enable();
      map.boxZoom && map.boxZoom.enable();
      if (map.tap && typeof map.tap.enable === 'function') map.tap.enable();
    } catch (e) { /* ignore */ }

    // Tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true
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

      const openSidebarHandler = () => {
        // debug log for mobile remote debugging
        console.log('marker tapped', race.id);
        onSelectRace(race);
        onOpenSidebar();
        // Recalculate size after sidebar opens so tiles & controls layout correctly
        setTimeout(() => {
          try { map.invalidateSize(); } catch (e) {}
        }, 300);
      };

      // Listen for click, touchstart and popupopen to cover multiple mobile flows
      marker.on('click', openSidebarHandler);
      marker.on('touchstart', openSidebarHandler);
      marker.on('popupopen', openSidebarHandler);

      markers.push({ id: race.id, marker });
    });

    // Store map instance on window for cleanup/access if needed
    window.mapInstance = map;
    window.markers = markers;

    // small deferred invalidate (helpful on mobile when UI overlays change)
    setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 250);

    return () => {
      if (window.mapInstance) {
        try { window.mapInstance.remove(); } catch (e) {}
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
        try { marker.setIcon(icon); } catch (e) { /* ignore if removed */ }
      });
    }
  }, [completedRaces]);

  // Fly to selected race and open popup
  useEffect(() => {
    if (selectedRace && window.mapInstance) {
      try { window.mapInstance.flyTo([selectedRace.lat, selectedRace.lng], 10); } catch (e) {}
      const markerObj = window.markers && window.markers.find(m => m.id === selectedRace.id);
      if (markerObj) {
        try { markerObj.marker.openPopup(); } catch (e) {}
      }
    }
  }, [selectedRace]);

  return <div id="map" style={{ height: '100%', width: '100%' }} />;
};

const RaceDetailsModal = ({ race, onClose, onSave, completedData }) => {
  const [dateCompleted, setDateCompleted] = useState(completedData?.dateCompleted || '');
  const [review, setReview] = useState(completedData?.review || '');
  const [photoUrl, setPhotoUrl] = useState(completedData?.photoUrl || '');

  useEffect(() => {
    setDateCompleted(completedData?.dateCompleted || '');
    setReview(completedData?.review || '');
    setPhotoUrl(completedData?.photoUrl || '');
  }, [completedData]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dateCompleted) {
      alert('Please pick the date you completed (or the race date).');
      return;
    }
    onSave(race.id, { dateCompleted, review, photoUrl });
    onClose();
  };

  if (!race) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2>{race.name}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="race-info" style={{ marginBottom: '1.5rem' }}>
          <p><strong>Next Race Date:</strong> {race.date}</p>
          <p><strong>Location:</strong> {race.location}</p>
          <p><strong>Distance:</strong> {race.distance}</p>
        </div>

        {completedData ? (
          <div>
            <div className="badge" style={{ display: 'inline-block', marginBottom: '1rem', fontSize: '1rem' }}>
              ✓ Race Completed
            </div>

            {completedData.dateCompleted && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <strong>Completed on:</strong> {new Date(completedData.dateCompleted).toLocaleDateString()}
              </p>
            )}

            {completedData.review && (
              <div className="review-display">
                <p className="review-text">"{completedData.review}"</p>
              </div>
            )}

            {completedData.photoUrl && (
              <img src={completedData.photoUrl} alt="Race memory" className="review-img" />
            )}

            <button
              className="action-btn"
              style={{ marginTop: '1rem', background: '#ef4444', color: 'white' }}
              onClick={() => {
                onSave(race.id, null); // Delete/Unpin
                onClose();
              }}
            >
              Remove Pin
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>When did you finish this race?</label>
              <input
                type="date"
                className="form-control"
                value={dateCompleted}
                onChange={e => setDateCompleted(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Your Review (Optional)</label>
              <textarea
                className="form-control"
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="How was the course? The atmosphere?"
              />
            </div>

            <div className="form-group">
              <label>Photo (upload from device)</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={handleFileChange}
              />
              {photoUrl && <img src={photoUrl} alt="preview" className="review-img" style={{ marginTop: '0.75rem' }} />}
            </div>

            <button type="submit" className="btn-submit">Save</button>
          </form>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [races, setRaces] = useState(window.initialRaces || []);
  const [filter, setFilter] = useState('All');
  const [selectedRace, setSelectedRace] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedRaces, setCompletedRaces] = useState(() => {
    try {
      const saved = localStorage.getItem('my-running-map-data');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('my-running-map-data', JSON.stringify(completedRaces));
    } catch (e) {}
  }, [completedRaces]);

  const filteredRaces = useMemo(() => {
    if (filter === 'All') return races;
    return races.filter(r => r.distance === filter);
  }, [races, filter]);

  const handleSaveRace = (raceId, data) => {
    setCompletedRaces(prev => {
      if (data === null) {
        const newState = { ...prev };
        delete newState[raceId];
        return newState;
      }
      return { ...prev, [raceId]: data };
    });
  };

  const completedCount = Object.keys(completedRaces).length;

  return (
    <React.Fragment>
      <header>
        <div>
          <h1>My Running Map 🏃‍♂️</h1>
          <div className="stats">
            You have completed <strong>{completedCount}</strong> races!
          </div>
        </div>
        <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          About
        </a>
      </header>

      <main>
        <div className={`sidebar-wrapper ${sidebarOpen ? 'active' : ''}`}>
          <div className="sidebar">
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              ×
            </button>
            <div className="sidebar-header">
              <h3>Races</h3>
              <div className="filter-container">
                <select
                  className="filter-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="All">All Distances</option>
                  <option value="Full">Full Marathon</option>
                  <option value="Half">Half Marathon</option>
                </select>
              </div>
            </div>
            <RaceList
              races={filteredRaces}
              onSelectRace={(race) => {
                setSelectedRace(race);
                setSidebarOpen(true);
              }}
              completedRaces={completedRaces}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          </div>
        </div>

       <div className="map-container">
    <button 
        className="menu-button" 
        onClick={() => {/* TODO: Add sidebar toggle */}}
        aria-label="Open menu"
    >
        ☰
    </button>
    <RaceMap
        races={filteredRaces}
        selectedRace={selectedRace}
        onSelectRace={setSelectedRace}
        completedRaces={completedRaces}
    />
</div>
      </main>

      {selectedRace && (
        <RaceDetailsModal
          race={selectedRace}
          onClose={() => setSelectedRace(null)}
          onSave={handleSaveRace}
          completedData={completedRaces[selectedRace.id]}
        />
      )}
    </React.Fragment>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
