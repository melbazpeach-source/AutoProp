// [trio] Stream 2 — in-app notification bell (backend already exists)
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check } from "lucide-react";
import { useLocation } from "wouter";

// [trio] Mirrors the getPriorityColor pattern from Alerts.tsx
function getPriorityColor(priority: string | null) {
  switch (priority) {
    case "urgent":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
}

function getRelativeTime(date: Date | string | null) {
  if (!date) return "";
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  if (diff < 0) return "just now";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const { data: notifications, refetch } =
    trpc.notifications.unread.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const count = notifications?.length ?? 0;
  const countLabel = count > 9 ? "9+" : String(count);

  const handleOpen = (notification: {
    id: number;
    actionUrl: string | null;
  }) => {
    markRead.mutate({ id: notification.id });
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
            >
              {countLabel}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        {count === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
            You're all caught up
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {notifications?.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(n)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      aria-label="Mark as read"
                      onClick={() => markRead.mutate({ id: n.id })}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(n.priority)}>
                      {n.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
