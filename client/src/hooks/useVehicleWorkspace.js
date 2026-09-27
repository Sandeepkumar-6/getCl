import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApi } from "./useApi";

export function useVehicleWorkspace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const result = useApi("/vehicles?includePolicies=true");
  const vehicles = Array.isArray(result.data) ? result.data : result.data?.items || [];
  const primary = vehicles.find((item) => item._id === user.primaryVehicle) || vehicles[0];
  const selected = vehicles.find((item) => item._id === params.get("vehicleId")) || primary;
  const select = (id) => {
    const next = new URLSearchParams(params);
    next.set("vehicleId", id);
    setParams(next, { replace: true });
  };
  return { ...result, vehicles, selected, primary, select };
}
