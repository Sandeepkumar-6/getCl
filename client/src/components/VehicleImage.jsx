import { useEffect, useState } from "react";
import { Camera, Car } from "lucide-react";
import { Field } from "./UI";
import { toast } from "sonner";
import { api, errorMessage } from "../services/api";
import { vehicleCatalogUrl } from "../utils/vehicleImages";
import { assets } from "../assets/manifest";
const { nexon, baleno, creta, amaze } = assets.vehicles;

const catalog = {
  "tata:nexon": nexon,
  "maruti suzuki:baleno": baleno,
  "maruti:baleno": baleno,
  "suzuki:baleno": baleno,
  "hyundai:creta": creta,
  "honda:amaze": amaze,
};
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

export default function VehicleImage({ vehicle, size = "card" }) {
  return <VehicleImageContent key={[vehicle?._id, vehicle?.photo?.version, vehicle?.manufacturer, vehicle?.model, vehicle?.manufacturingYear, vehicle?.color, vehicle?.paintCode].join(":")} vehicle={vehicle} size={size} />;
}

function VehicleImageContent({ vehicle, size }) {
  const [photo, setPhoto] = useState("");
  const [failed, setFailed] = useState(false);
  const [failedUrls, setFailedUrls] = useState([]);
  const path = vehicle?._id && vehicle?.photo?.version ? `/vehicles/${vehicle._id}/photo?v=${vehicle.photo.version}` : null;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let objectUrl;
    api.get(path, { responseType: "blob", signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!["image/jpeg", "image/png"].includes(data.type)) throw new Error("Photo unavailable");
      objectUrl = URL.createObjectURL(data);
      setPhoto(objectUrl);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  const illustration = catalog[`${normalize(vehicle?.manufacturer)}:${normalize(vehicle?.model)}`];
  const remote = vehicleCatalogUrl(vehicle, import.meta.env.VITE_IMAGIN_CUSTOMER_KEY, size);
  const loadingPhoto = Boolean(path && !photo && !failed);
  const source = loadingPhoto ? null : [photo, remote, illustration].find((url) => url && !failedUrls.includes(url));
  const actualPhoto = Boolean(source && source === photo);
  const catalogPhoto = Boolean(source && source === remote);
  const name = [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") || "Vehicle";
  const alt = actualPhoto ? `Photo of your ${name}` : catalogPhoto ? `Catalogue image of a ${name}` : `Illustration of a ${name}`;
  return (
    <figure className={`gc-vehicle-img gc-vehicle-img--${size}${actualPhoto ? " is-photo" : ""}`} title={actualPhoto ? name : `${alt}. Colour and variant may differ.`}>
      {source ? <img key={source} src={source} alt={alt} loading="lazy" decoding="async" referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailedUrls((urls) => [...urls, source])} /> : <div className="gc-vehicle-img-empty" role="img" aria-label={loadingPhoto ? `Loading photo of ${name}` : `No picture of ${name}`}><Car aria-hidden="true" size={size === "thumb" ? 24 : 48} /></div>}
    </figure>
  );
}

export function VehiclePhotoUpload({ vehicle, onSaved }) {
  const [busy, setBusy] = useState(false);
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      toast.error("Choose a JPG or PNG photo, up to 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      await api.post(`/vehicles/${vehicle._id}/photo`, data);
      toast.success("Vehicle photo updated across your claims.");
      onSaved?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return <div className="gc-photo-control">
    <label className={`gc-btn gc-btn--secondary gc-btn--sm${busy ? " is-busy" : ""}`}>
      <Camera className="gc-icon gc-icon--sm" aria-hidden="true" />
      <span>{busy ? "Uploading photo…" : vehicle.photo?.version ? "Change photo" : "Add your own photo"}</span>
      <input className="gc-sr" aria-label={`Upload a photo of your ${vehicle.manufacturer} ${vehicle.model}`} type="file" accept="image/jpeg,image/png" disabled={busy} onChange={upload} />
    </label>
    <span className="gc-note">JPG or PNG, up to 8 MB. Shown on this vehicle and its claims.</span>
  </div>;
}

export function VehicleAppearanceForm({ vehicle, onSaved }) {
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/vehicles/${vehicle._id}/appearance`, Object.fromEntries(new FormData(event.currentTarget)));
      toast.success("Vehicle colour saved.");
      onSaved?.();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <details className="gc-disclosure">
    <summary>Colour and paint code</summary>
    <form className="gc-form" onSubmit={save}>
      <div className="gc-form-grid">
        <Field label="Colour" hint="The maker's paint name, such as Atlas White"><input name="color" defaultValue={vehicle.color} maxLength={80} required /></Field>
        <Field label="Paint code" optional><input name="paintCode" defaultValue={vehicle.paintCode} maxLength={40} /></Field>
      </div>
      <div className="gc-form-actions"><button className="gc-btn gc-btn--sm" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save colour"}</button></div>
    </form>
  </details>;
}
