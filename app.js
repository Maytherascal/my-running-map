const { useState, useEffect, useMemo } = React;

// --- Components ---

const RaceList = ({ races, onSelectRace, completedRaces }) => {
    return (
        <div className="race-list">
            {races.map(race => {
                const isCompleted = completedRaces[race.id];
                return (
                    <div
                        key={race.id}
                        className={`race-card ${isCompleted ? 'completed' : ''}`}
                        onClick={() => onSelectRace(race)}
                    >
                        <div className="race-header">
                            <span className="race-name">{race.name}</span>
                            {isCompleted && <span className="badge">✓ Done</span>}
                        </div>
                        <div className="race-details">
                            <span>📅 {race.date}</span>
                            <span>📍 {race.location}</span>
                            <span>🏃 {race.distance}</span>
                        </div>
                        <button className="action-btn btn-view">
                            View Details
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const RaceMap = ({ races, selectedRace, onSelectRace, completedRaces }) => {
    // Initialize map
    useEffect(() => {
        const map = L.map('map').setView([39.8283, -98.5795], 4); // Center of USA

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
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
                .bindPopup(`<b>${race.name}</b><br>${race.location}`)
                .on('click', () => onSelectRace(race));

            markers.push({ id: race.id, marker });
        });

        // Store map instance on window for cleanup/access if needed
        window.mapInstance = map;
        window.markers = markers;

        return () => {
            map.remove();
        };
    }, []); // Run once on mount

    // Update markers when completedRaces changes
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

            // Find and open popup
            const markerObj = window.markers.find(m => m.id === selectedRace.id);
            if (markerObj) {
                markerObj.marker.openPopup();
            }
        }
    }, [selectedRace]);

    return <div id="map"></div>;
};

const RaceDetailsModal = ({ race, onClose, onSave, completedData }) => {
    const [review, setReview] = useState(completedData?.review || '');
    const [photoUrl, setPhotoUrl] = useState(completedData?.photoUrl || '');
    const [isCompleted, setIsCompleted] = useState(!!completedData);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(race.id, {
            completed: true,
            review,
            photoUrl,
            dateCompleted: new Date().toISOString()
        });
        onClose();
    };

    if (!race) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{race.name}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="race-info" style={{ marginBottom: '1.5rem' }}>
                    <p><strong>Date:</strong> {race.date}</p>
                    <p><strong>Location:</strong> {race.location}</p>
                    <p><strong>Distance:</strong> {race.distance}</p>
                </div>

                {completedData ? (
                    <div className="completed-view">
                        <div className="badge" style={{ display: 'inline-block', marginBottom: '1rem', fontSize: '1rem' }}>
                            ✓ Race Completed
                        </div>

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
                            <label>Did you finish this race?</label>
                            <button type="submit" className="btn-submit">
                                Yes, Pin it! 📌
                            </button>
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
                            <label>Photo URL (Optional)</label>
                            <input
                                type="text"
                                className="form-control"
                                value={photoUrl}
                                onChange={e => setPhotoUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
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
    const [completedRaces, setCompletedRaces] = useState(() => {
        const saved = localStorage.getItem('my-running-map-data');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('my-running-map-data', JSON.stringify(completedRaces));
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

    // Stats
    const completedCount = Object.keys(completedRaces).length;
    const totalDistance = Object.values(completedRaces).reduce((acc, curr) => {
        // Rough estimate: Full = 42.2km, Half = 21.1km
        // We need to look up the race distance from the ID
        const race = races.find(r => r.id.toString() === Object.keys(completedRaces).find(key => completedRaces[key] === curr));
        // Simplified for now
        return acc + 0;
    }, 0);

    return (
        <React.Fragment>
            <header>
                <div>
                    <h1>My Running Map 🏃‍♂️</h1>
                    <div className="stats">
                        You have completed <strong>{completedCount}</strong> races!
                    </div>
                </div>
                <a href="https://github.com" target="_blank" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                    About
                </a>
            </header>

            <main>
                <div className="sidebar">
                    <div className="filters">
                        {['All', 'Full', 'Half'].map(f => (
                            <button
                                key={f}
                                className={`filter-btn ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f} Marathon
                            </button>
                        ))}
                    </div>
                    <RaceList
                        races={filteredRaces}
                        onSelectRace={setSelectedRace}
                        completedRaces={completedRaces}
                    />
                </div>

                <div className="map-container">
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
