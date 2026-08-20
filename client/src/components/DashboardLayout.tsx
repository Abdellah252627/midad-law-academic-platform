import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Bell, BarChart3, ExternalLink, FileCog, Files, Headset, LogOut, MessageSquareWarning, PanelLeft, ReceiptText, Settings2, ShieldAlert, UserRound, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { trpc } from "@/lib/trpc";
import { ADMIN_NOTIFICATION_DEFINITIONS } from "@shared/adminNotifications";
import { Button } from "./ui/button";

const menuItems = [
  { icon: FileCog, label: "إدارة صفحة الهبوط", path: "/admin" },
  { icon: ReceiptText, label: "طلبات الشراء والدفع", path: "/admin/purchases" },
  { icon: MessageSquareWarning, label: "إدارة الشكاوى", path: "/admin/complaints" },
  { icon: Headset, label: "طلبات التواصل", path: "/admin/follow-ups" },
  { icon: Bell, label: "كل التنبيهات", path: "/admin/notifications" },
  { icon: Files, label: "الملفات والإصدارات", path: "/admin/files" },
  { icon: Users, label: "بيانات المهتمين", path: "/admin/leads" },
  { icon: ShieldAlert, label: "سجل التدقيق", path: "/admin/audit-logs" },
  { icon: BarChart3, label: "الإحصائيات", path: "/admin/analytics" },
  { icon: Settings2, label: "الإعدادات العامة", path: "/admin/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const {
    data: isAuthorizedAdmin,
    isLoading: adminCheckLoading,
    isError: adminCheckError,
    refetch: refetchAdminCheck,
  } = trpc.auth.isAdmin.useQuery();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading || adminCheckLoading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 dir="rtl" className="text-2xl font-semibold tracking-tight text-center">
              دخول لوحة الإدارة
            </h1>
            <p dir="rtl" className="text-sm text-muted-foreground text-center max-w-sm">
              هذه اللوحة مخصصة لحسابات الإدارة. تابع لفتح صفحة تسجيل الدخول الآمنة.
            </p>
            <p dir="rtl" role="note" className="max-w-sm text-center text-xs leading-6 text-muted-foreground">
              إذا تعذر التحقق الخارجي أو ظهرت رسالة CAPTCHA، أعد المحاولة من متصفح بشري صالح دون تعطيل الحماية أو تجاوزها.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  if (adminCheckError) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f3eb] px-4">
        <div className="max-w-md rounded-[28px] border border-amber-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-700" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-[#173247]">تعذر التحقق من الصلاحية</h1>
          <p className="mt-3 text-sm leading-7 text-[#68747a]">تعذر الاتصال بخدمة التحقق مؤقتاً، ولم يتم اعتبار الحساب غير مصرح.</p>
          <Button onClick={() => refetchAdminCheck()} className="mt-5 bg-[#173247] text-white hover:bg-[#24465e]">إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f3eb] px-4"><div className="max-w-md rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه اللوحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></div>;
  }

  return (
    <SidebarProvider
      className="relative isolate"
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { data: newFollowUpsCount = 0 } = trpc.admin.newSupportFollowUpCount.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const notificationUtils = trpc.useUtils();
  const { data: notificationUnreadCount = 0 } = trpc.admin.notificationUnreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: notificationData, isLoading: notificationsLoading } = trpc.admin.notifications.useQuery(
    { page: 1, pageSize: 10 },
    { refetchInterval: 30_000, refetchOnWindowFocus: true },
  );
  const markNotificationRead = trpc.admin.markNotificationRead.useMutation({
    onSuccess: () => {
      void notificationUtils.admin.notificationUnreadCount.invalidate();
      void notificationUtils.admin.notifications.invalidate();
    },
  });
  const markNotificationsRead = trpc.admin.markNotificationsRead.useMutation({
    onSuccess: () => {
      void notificationUtils.admin.notificationUnreadCount.invalidate();
      void notificationUtils.admin.notifications.invalidate();
    },
  });

  const openNotification = (notification: NonNullable<typeof notificationData>["notifications"][number]) => {
    if (!notification.isRead) {
      markNotificationRead.mutate({ id: notification.id });
    }
    setLocation(notification.targetPath);
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 z-30"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
            <a
              href="/"
              aria-label="عرض صفحة الهبوط العامة"
              title="عرض صفحة الهبوط العامة"
              className="mx-2 mt-2 flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate group-data-[collapsible=icon]:hidden">صفحة الهبوط</span>
            </a>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {item.path === "/admin/follow-ups" && newFollowUpsCount > 0 && (
                          <span
                            aria-label={`${newFollowUpsCount} طلبات تواصل جديدة`}
                            className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:-top-1"
                          >
                            {newFollowUpsCount > 99 ? "99+" : newFollowUpsCount}
                          </span>
                        )}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/account")}
                  className="cursor-pointer"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  <span>حسابي</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="relative z-0 min-w-0 w-full overflow-x-hidden">
        <div className="relative z-40 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0">
          <div className="flex min-w-0 items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 shrink-0 rounded-lg bg-background" />}
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Back Office"}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`التنبيهات${notificationUnreadCount > 0 ? `، ${notificationUnreadCount} غير مقروءة` : ""}`}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-2">
              <div dir="rtl" className="flex items-center justify-between gap-3 px-2 pb-2">
                <div>
                  <p className="text-sm font-semibold">أحدث التنبيهات</p>
                  <p className="text-xs text-muted-foreground">
                    {notificationUnreadCount > 0 ? `${notificationUnreadCount} غير مقروءة` : "لا توجد تنبيهات غير مقروءة"}
                  </p>
                </div>
                {notificationData?.notifications.some(item => !item.isRead) ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    disabled={markNotificationsRead.isPending}
                    onClick={() => markNotificationsRead.mutate({ ids: notificationData.notifications.filter(item => !item.isRead).map(item => item.id) })}
                  >
                    تحديد غير المقروء كمقروء
                  </button>
                ) : null}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">جاري تحميل التنبيهات...</p>
                ) : notificationData?.notifications.length ? (
                  notificationData.notifications.map(notification => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className={`mb-1 cursor-pointer items-start gap-3 rounded-xl p-3 last:mb-0 ${notification.isRead ? "" : "bg-primary/5"}`}
                    >
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.priority === "critical" ? "bg-red-600" : notification.priority === "high" ? "bg-amber-500" : "bg-blue-500"}`} aria-hidden="true" />
                      <span dir="rtl" className="min-w-0 flex-1 text-right">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${notification.isRead ? "font-normal" : "font-semibold"}`}>{notification.title}</span>
                          {!notification.isRead && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">جديد</span>}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{ADMIN_NOTIFICATION_DEFINITIONS[notification.type as keyof typeof ADMIN_NOTIFICATION_DEFINITIONS]?.label ?? "تنبيه إداري"}</span>
                          <span aria-hidden="true">•</span>
                          <span>{notification.priority === "critical" ? "أولوية حرجة" : "أولوية عالية"}</span>
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.message}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(notification.createdAt).toLocaleString("ar-MA", { dateStyle: "short", timeStyle: "short" })}</span>
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <p dir="rtl" className="px-2 py-6 text-center text-sm text-muted-foreground">لا توجد تنبيهات واردة حالياً.</p>
                )}
              </div>
              <DropdownMenuItem onClick={() => setLocation("/admin/notifications")} className="mt-2 cursor-pointer justify-center rounded-xl border border-border/70 text-sm font-semibold">
                عرض كل التنبيهات
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <main className="min-w-0 w-full flex-1 overflow-x-hidden p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
