import { IconSearch } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { getProfile, profileInitials } from "@/lib/profile";
import { ProfileDropdown } from "./ProfileDropdown";
import { NotificationDropdown } from "./NotificationDropdown";

export async function Topbar({ subtitle }: { subtitle?: string }) {
  const profile = await getProfile();
  return (
    <header className="flex items-center gap-4 px-6 md:px-10 py-5 border-b border-[var(--color-edge-soft)] sticky top-0 z-20 backdrop-blur-xl topbar-bg">
      <div className="relative flex-1 max-w-md">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300/50" />
        <input
          className="input pl-10 py-2.5 text-sm"
          placeholder={subtitle ?? "Buscar leads, conversaciones..."}
        />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle compact />
        <NotificationDropdown />
        <ProfileDropdown
          name={profile.name}
          role={profile.role}
          initials={profileInitials(profile.name)}
        />
      </div>
    </header>
  );
}
