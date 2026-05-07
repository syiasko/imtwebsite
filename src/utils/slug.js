// Convert any string into a URL-safe slug.
// Matches the behavior used in DataContext.upsertVehicle / upsertCategory.

export const slugify = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Lookup a vehicle by either its stored slug, its derived-from-name slug, or its id.
// This way old links (/produk/v-1234567890) keep working while new SEO links
// (/produk/aerial-platform-12m) take priority.
export const findVehicleByParam = (vehicles, param) => {
  if (!param || !Array.isArray(vehicles)) return null;
  const target = String(param).trim().toLowerCase();
  return (
    vehicles.find((v) => v.slug && v.slug === target) ||
    vehicles.find((v) => slugify(v.name) === target) ||
    vehicles.find((v) => v.id === target) ||
    null
  );
};

// Returns the canonical URL path for a vehicle.
export const vehiclePath = (vehicle) => {
  if (!vehicle) return "/produk";
  return `/produk/${vehicle.slug || slugify(vehicle.name) || vehicle.id}`;
};
