import { useState } from 'react';
import { ChevronDownIcon, LogOutIcon, SparklesIcon, UserPlusIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDelight } from '../delight/useDelight';
import { InviteDialog } from './InviteDialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function UserMenu({
  displayName, budgetName, budgetId,
}: { displayName: string; budgetName: string; budgetId: string }) {
  const { userEnabled, toggle } = useDelight();
  const [inviteOpen, setInviteOpen] = useState(false);
  const initial = (displayName.trim()[0] ?? '?').toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2 text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu tài khoản"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initial}
            </span>
            <span className="max-w-[8rem] truncate font-medium">{displayName}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <div className="font-semibold leading-tight">{displayName}</div>
            <div className="text-xs font-normal text-muted-foreground">{budgetName}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setInviteOpen(true)}>
            <UserPlusIcon /> Mời thành viên
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); toggle(); }}
          >
            <SparklesIcon /> Hiệu ứng chuyển động
            <span className="ml-auto text-xs text-muted-foreground">{userEnabled ? 'Bật' : 'Tắt'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => supabase.auth.signOut()}>
            <LogOutIcon /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteDialog budgetId={budgetId} open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
