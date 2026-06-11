import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon for days
const createCustomIcon = (dayNumber) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="marker-pin"><span>${dayNumber}</span></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
};

// Waypoint marker icon (different style for auto vs manual)
const createWaypointIcon = (type) => {
  const color = type === "auto" ? "#4a90d9" : "#e67e22";
  return L.divIcon({
    className: "waypoint-marker",
    html: `<div class="waypoint-pin" style="background-color: ${color};">
      <span>${type === "auto" ? "★" : "♥"}</span>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Start location marker icon
const createStartIcon = () => {
  return L.divIcon({
    className: "start-marker",
    html: `<div class="start-pin"><span>起</span></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
};

// Component to fit bounds
function FitBounds({ days, waypoints, startLocation }) {
  const map = useMap();

  useEffect(() => {
    const coords = [];

    // Add day coordinates
    days
      .filter((day) => day?.location?.coordinates)
      .forEach((day) => {
        coords.push([
          day.location.coordinates[1], // lat
          day.location.coordinates[0], // lng
        ]);
      });

    // Add waypoint coordinates
    waypoints
      .filter((wp) => wp?.coordinates?.coordinates || wp?.coordinates)
      .forEach((wp) => {
        const coords_arr = wp.coordinates?.coordinates || wp.coordinates;
        if (Array.isArray(coords_arr) && coords_arr.length >= 2) {
          coords.push([coords_arr[1], coords_arr[0]]);
        }
      });

    // Add start location
    if (startLocation?.coordinates) {
      coords.push([startLocation.coordinates[1], startLocation.coordinates[0]]);
    }

    if (coords.length > 0) {
      if (coords.length === 1) {
        map.setView(coords[0], 12);
      } else {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [days, waypoints, startLocation, map]);

  return null;
}

export default function MapView({ days, waypoints = [], startLocation = null, height = 400 }) {
  // Default center (will be overridden by FitBounds)
  const defaultCenter = [35.0116, 135.7681]; // Kyoto
  const defaultZoom = 12;

  // Extract coordinates for polyline
  const polylineCoords = days
    .filter((day) => day?.location?.coordinates)
    .map((day) => [
      day.location.coordinates[1], // lat
      day.location.coordinates[0], // lng
    ]);

  // Build segmented path with waypoints
  const buildPathSegments = () => {
    const segments = [];
    const dayCoords = days
      .filter((day) => day?.location?.coordinates)
      .map((day) => [day.location.coordinates[1], day.location.coordinates[0]]);

    if (dayCoords.length === 0) return segments;

    // Add start location as first point if available
    let currentPath = startLocation?.coordinates
      ? [[startLocation.coordinates[1], startLocation.coordinates[0]]]
      : [];

    // Interleave waypoints between days
    const sortedWaypoints = [...waypoints].sort((a, b) => {
      const aDay = a.betweenDays?.[0] || 0;
      const bDay = b.betweenDays?.[0] || 0;
      return aDay - bDay;
    });

    let waypointIndex = 0;
    dayCoords.forEach((coord, dayIndex) => {
      currentPath.push(coord);

      // Check if any waypoint should be inserted after this day
      while (waypointIndex < sortedWaypoints.length) {
        const wp = sortedWaypoints[waypointIndex];
        const wpCoords = wp.coordinates?.coordinates || wp.coordinates;
        if (wp.betweenDays && wp.betweenDays[0] === dayIndex + 1) {
          currentPath.push([wpCoords[1], wpCoords[0]]);
          waypointIndex++;
        } else {
          break;
        }
      }

      // End segment at each day for now (can be refined)
      if (currentPath.length >= 2) {
        segments.push([...currentPath]);
      }
      currentPath = [coord];
    });

    // If no waypoints, just return simple path
    if (waypoints.length === 0 && polylineCoords.length > 1) {
      return [polylineCoords];
    }

    return segments;
  };

  const pathSegments = buildPathSegments();

  return (
    <div className="map-view" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds days={days} waypoints={waypoints} startLocation={startLocation} />

        {/* Start location marker */}
        {startLocation?.coordinates && (
          <Marker
            key="start-location-marker"
            position={[startLocation.coordinates[1], startLocation.coordinates[0]]}
            icon={createStartIcon()}
          >
            <Popup>
              <div className="map-popup">
                <strong>起点</strong>
                <p>{startLocation.name || "起始地点"}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Markers for each day */}
        {days.map((day, index) => {
          if (!day?.location?.coordinates) return null;
          const [lng, lat] = day.location.coordinates;
          return (
            <Marker
              key={`marker-${day.dayNumber}-${index}`}
              position={[lat, lng]}
              icon={createCustomIcon(day.dayNumber)}
            >
              <Popup>
                <div className="map-popup">
                  <strong>Day {day.dayNumber}</strong>
                  <p>{day.title}</p>
                  {day.location?.name && (
                    <span className="map-popup__location">{day.location.name}</span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Waypoint markers */}
        {waypoints.map((wp, index) => {
          const coords = wp.coordinates?.coordinates || wp.coordinates;
          if (!coords || coords.length < 2) return null;
          const [lng, lat] = coords;
          return (
            <Marker
              key={`waypoint-${index}`}
              position={[lat, lng]}
              icon={createWaypointIcon(wp.type)}
            >
              <Popup>
                <div className="map-popup">
                  <span className={`waypoint-badge waypoint-badge--${wp.type}`}>
                    {wp.type === "auto" ? "推荐" : "自选"}
                  </span>
                  <p>{wp.name}</p>
                  {wp.betweenDays && (
                    <span className="map-popup__between">
                      Day {wp.betweenDays[0]} → Day {wp.betweenDays[1]}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Path segments connecting all points */}
        {pathSegments.map((segment, index) => (
          <Polyline
            key={`segment-${index}`}
            positions={segment}
            color={index === 0 ? "#4a90d9" : "#d0683b"}
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        ))}
      </MapContainer>
    </div>
  );
}