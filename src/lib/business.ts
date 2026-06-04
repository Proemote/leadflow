import { getSetting, setSetting, isSupabaseConfigured } from "./db";
import { BusinessConfig, BusinessType, OpenHours } from "./types";

export const DEFAULT_OPEN_HOURS: OpenHours = {
  "1": [["10:00", "20:00"]],
  "2": [["10:00", "20:00"]],
  "3": [["10:00", "20:00"]],
  "4": [["10:00", "20:00"]],
  "5": [["10:00", "20:00"]],
  "6": [["10:00", "14:00"]],
  "0": [],
};

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export async function getBusinessConfig(): Promise<BusinessConfig> {
  if (!isSupabaseConfigured()) {
    return {
      businessType: "appointments",
      openHours: DEFAULT_OPEN_HOURS,
      slotMin: 30,
    };
  }
  const [type, hours, slot] = await Promise.all([
    getSetting("business_type", "appointments"),
    getSetting("open_hours", JSON.stringify(DEFAULT_OPEN_HOURS)),
    getSetting("slot_min", "30"),
  ]);

  let openHours: OpenHours;
  try {
    openHours = JSON.parse(hours);
  } catch {
    openHours = DEFAULT_OPEN_HOURS;
  }

  return {
    businessType: (type as BusinessType) === "orders" ? "orders" : "appointments",
    openHours,
    slotMin: Math.max(5, parseInt(slot, 10) || 30),
  };
}

export async function setBusinessConfig(cfg: Partial<BusinessConfig>): Promise<void> {
  if (cfg.businessType) await setSetting("business_type", cfg.businessType);
  if (cfg.openHours) await setSetting("open_hours", JSON.stringify(cfg.openHours));
  if (cfg.slotMin) await setSetting("slot_min", String(cfg.slotMin));
}
