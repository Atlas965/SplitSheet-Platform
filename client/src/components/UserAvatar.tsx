import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getUserInitials, getUserDisplayName } from "@/lib/userUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, CreditCard, LogOut } from "lucide-react";

interface UserAvatarProps {
  /** Show profile / billing / logout menu on click */
  showMenu?: boolean;
  className?: string;
}

export default function UserAvatar({ showMenu = true, className = "" }: UserAvatarProps) {
  const { user } = useAuth();
  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const avatar = (
    <div
      className={`w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${className}`}
      title={displayName}
      data-testid="user-avatar"
    >
      {user?.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt={displayName}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );

  if (!showMenu) return avatar;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label={`Account menu for ${displayName}`}
        >
          {avatar}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center w-full cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/billing" className="flex items-center w-full cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" /> Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={() => { window.location.href = "/api/logout"; }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
