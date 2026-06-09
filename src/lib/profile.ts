import { getSetting, setSetting, isSupabaseConfigured } from "./db";

export interface Profile {
  name: string;
  role: string;
  email: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "Alex Carter",
  role: "Responsable de ventas",
  email: "",
};

export async function getProfile(): Promise<Profile> {
  if (!isSupabaseConfigured()) return DEFAULT_PROFILE;
  const raw = await getSetting("profile", "");
  if (!raw) return DEFAULT_PROFILE;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name || DEFAULT_PROFILE.name,
      role: p.role || DEFAULT_PROFILE.role,
      email: p.email || "",
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function setProfile(p: Profile): Promise<void> {
  await setSetting("profile", JSON.stringify(p));
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
