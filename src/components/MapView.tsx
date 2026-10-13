import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { categoryLabel, type Place } from "@/lib/places";

const pin = L.divIcon({ className: "", html: '<div class="ht-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
const me = L.divIcon({ className: "", html: '<div class="ht-pin-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

type Props = {
  center: [number, number];
  zoom?: number;
  places?: Place[];
  userPos?: [number, number] | null;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
};

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center[0], center[1], zoom]);
  return null;
}

function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView({ center, zoom = 11, places = [], userPos, picked, onPick, onSelect }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} zoom={zoom} />
      {onPick && <Picker onPick={onPick} />}
      {userPos && <Marker position={userPos} icon={me} />}
      {picked && <Marker position={picked} icon={pin} />}
      {places.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pin}>
          <Popup>
            <button className="text-left" onClick={() => onSelect?.(p.id)}>
              <strong>{p.name}</strong>
              <br />
              <span>{categoryLabel(p.category)}</span>
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
