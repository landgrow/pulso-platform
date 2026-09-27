"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@supabase/supabase-js";
import { cn, getInitials } from "@/lib/utils";

interface UserDropdownProps {
  user: User | null;
  placement?: "header" | "rail";
}

export function UserDropdown({
  user,
  placement = "header",
}: UserDropdownProps): JSX.Element {
  const router = useRouter();
  const rail = placement === "rail";

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário";
  const email = user?.email ?? "";
  const initials = getInitials(displayName);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("relative rounded-full", rail ? "h-8 w-8" : "h-9 w-9")}
          title={displayName}
        >
          <Avatar className={rail ? "h-7 w-7" : "h-9 w-9"}>
            <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={rail ? "start" : "end"}
        side={rail ? "top" : "bottom"}
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-text-1 leading-none">
              {displayName}
            </p>
            <p className="text-xs text-text-2 leading-none">{email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push("/configuracoes")}
          className="cursor-pointer"
        >
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-error focus:text-error"
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
