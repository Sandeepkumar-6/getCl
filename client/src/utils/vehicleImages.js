// IMAGIN's customer identifier is designed for direct browser CDN requests.
// Never put a private API secret here. No personal or registration data is sent.
const slug = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
export function vehicleCatalogUrl(vehicle, customerKey, size = "card") {
  if (!customerKey?.trim() || !vehicle?.manufacturer?.trim() || !vehicle?.model?.trim() || vehicle.vehicleType === "Motorcycle") return null;
  const params = new URLSearchParams({
    customer: customerKey.trim(),
    make: slug(vehicle.manufacturer),
    modelFamily: slug(vehicle.model),
    angle: "23",
    zoomType: "fullscreen",
    width: size === "thumb" ? "200" : "800",
    fileType: "jpg",
  });
  if (vehicle.manufacturingYear) params.set("modelYear", String(vehicle.manufacturingYear));
  if (vehicle.color?.trim()) params.set("paintDescription", slug(vehicle.color));
  if (vehicle.paintCode?.trim()) params.set("paintId", vehicle.paintCode.trim());
  if (vehicle.fuelType && vehicle.fuelType !== "Other") params.set("powerTrain", slug(vehicle.fuelType));
  return `https://cdn.imagin.studio/getImage?${params}`;
}
