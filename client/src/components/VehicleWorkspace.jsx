import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Car, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../services/api";
import { Empty, ErrorState, Loading, Plate, plateType } from "./UI";
import { plate } from "../utils/format";

export function VehicleWorkspaceGate({ workspace, children }) {
  if (workspace.loading) return <Loading label="Loading your vehicles…" />;
  if (workspace.error) return <ErrorState message={workspace.error} retry={workspace.reload} />;
  if (!workspace.selected)
    return (
      <Empty
        icon={Car}
        title="You haven’t added a vehicle"
        description="Add your vehicle to keep its policy, service records, documents and claims together."
        action={<Link className="gc-btn" to="/portal/vehicles?add=vehicle"><Plus className="gc-icon" aria-hidden="true" />Add a vehicle</Link>}
      />
    );
  return children;
}

export function VehicleSwitcher({ workspace }) {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!workspace.selected) return null;
  const selected = workspace.selected;
  const primary = selected._id === workspace.primary?._id;
  const savePrimary = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/vehicles/${selected._id}/primary`);
      setUser((value) => ({ ...value, primaryVehicle: data.primaryVehicle }));
      toast.success(`${selected.manufacturer} ${selected.model} is now your main vehicle.`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return (
    <div className="gc-switcher">
      {workspace.vehicles.length > 1 ? (
        <div className="gc-field gc-switcher-select">
          <label className="gc-field-label" htmlFor="vehicle-switch">Vehicle</label>
          <select id="vehicle-switch" value={selected._id} onChange={(event) => workspace.select(event.target.value)}>
            {workspace.vehicles.map((vehicle) => <option value={vehicle._id} key={vehicle._id}>{vehicle.manufacturer} {vehicle.model} · {plate(vehicle.registrationNumber)}</option>)}
          </select>
        </div>
      ) : (
        <div className="gc-switcher-one"><Plate registration={selected.registrationNumber} type={plateType(selected)} /><strong>{selected.manufacturer} {selected.model}</strong></div>
      )}
      <div className="gc-switcher-tools">
        {workspace.vehicles.length > 1 && (primary ? (
          <span className="gc-note gc-switcher-main"><Star className="gc-icon gc-icon--sm" aria-hidden="true" />Your main vehicle</span>
        ) : user.emailVerified ? (
          <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" disabled={busy} aria-busy={busy} onClick={savePrimary}><Star className="gc-icon gc-icon--sm" aria-hidden="true" />{busy ? "Saving…" : "Make this my main vehicle"}</button>
        ) : null)}
        <Link className="gc-link gc-link--arrow" to="/portal/vehicles">All vehicles <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
