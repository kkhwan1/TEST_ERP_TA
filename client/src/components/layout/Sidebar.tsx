import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  Box,
  Factory,
  Wallet,
  FileText,
  Menu,
  Package,
  FileInput,
  LogOut,
  Users,
  ClipboardList,
  ChevronDown,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// 타입 정의
interface SubMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  children?: SubMenuItem[];
}

// 그룹화된 메뉴 데이터
const menuItems: MenuItem[] = [
  // 단독 메뉴
  { icon: LayoutDashboard, label: "대시보드", href: "/" },

  // 전표 관리 그룹
  {
    icon: FileInput,
    label: "전표 관리",
    children: [
      { icon: Package, label: "일일 전표 입력", href: "/daily-entry" },
      { icon: ClipboardList, label: "거래내역 조회", href: "/transactions" },
    ],
  },

  // 재고 관리 그룹
  {
    icon: Box,
    label: "재고 관리",
    children: [
      { icon: Box, label: "재고/수불부", href: "/inventory" },
      { icon: FileText, label: "월마감/보고서", href: "/closing" },
    ],
  },

  // 기준정보 그룹
  {
    icon: Database,
    label: "기준정보",
    children: [
      { icon: Database, label: "품목 관리", href: "/master" },
      { icon: Users, label: "거래처 관리", href: "/partners" },
      { icon: Factory, label: "BOM 관리", href: "/bom" },
      { icon: Wallet, label: "단가 관리", href: "/prices" },
    ],
  },
];

// 그룹 라벨 목록 (초기 상태용)
const groupLabels = menuItems
  .filter(item => item.children)
  .map(item => item.label);

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  // 모든 그룹을 기본으로 열어둠
  const [openGroups, setOpenGroups] = useState<string[]>(groupLabels);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  // 현재 경로가 해당 서브메뉴에 포함되는지 확인
  const isChildActive = (item: MenuItem) => {
    return item.children?.some(child => child.href === location);
  };

  return (
    <div className={cn("pb-12 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 flex-shrink-0 hidden md:block", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="h-8 w-8 bg-sidebar-primary rounded-md flex items-center justify-center text-sidebar-primary-foreground font-bold">T</div>
          <h2 className="text-lg font-semibold tracking-tight">태창금속 ERP</h2>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-sidebar-foreground/50 uppercase">
            Menu
          </h2>
          <div className="space-y-1">
            {menuItems.map((item) => (
              item.children ? (
                // 그룹 메뉴
                <Collapsible
                  key={item.label}
                  open={openGroups.includes(item.label)}
                  onOpenChange={() => toggleGroup(item.label)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between",
                        isChildActive(item)
                          ? "text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <span className="flex items-center">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        openGroups.includes(item.label) && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-1 mt-1">
                    {item.children.map(child => (
                      <Link key={child.href} href={child.href}>
                        <Button
                          variant={location === child.href ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            location === child.href
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <child.icon className="mr-2 h-4 w-4" />
                          {child.label}
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // 단독 메뉴
                <Link key={item.href} href={item.href!}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      location === item.href
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            ))}
          </div>
        </div>
        <div className="px-3 py-2 mt-auto">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-sidebar-foreground/50 uppercase">
            User
          </h2>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent/50">
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  // 모든 그룹을 기본으로 열어둠
  const [openGroups, setOpenGroups] = useState<string[]>(groupLabels);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  // 현재 경로가 해당 서브메뉴에 포함되는지 확인
  const isChildActive = (item: MenuItem) => {
    return item.children?.some(child => child.href === location);
  };

  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
      <div className="font-bold flex items-center gap-2">
        <div className="h-6 w-6 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs">T</div>
        태창금속
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-sidebar-border w-64 p-0">
          <div className="space-y-4 py-4">
            <div className="px-6 py-2">
              <h2 className="text-lg font-semibold tracking-tight">태창금속 ERP</h2>
            </div>
            <div className="px-3 py-2">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  item.children ? (
                    // 그룹 메뉴
                    <Collapsible
                      key={item.label}
                      open={openGroups.includes(item.label)}
                      onOpenChange={() => toggleGroup(item.label)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-between",
                            isChildActive(item)
                              ? "text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <span className="flex items-center">
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            openGroups.includes(item.label) && "rotate-180"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-1 mt-1">
                        {item.children.map(child => (
                          <Link key={child.href} href={child.href} onClick={() => setOpen(false)}>
                            <Button
                              variant={location === child.href ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start",
                                location === child.href
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                              )}
                            >
                              <child.icon className="mr-2 h-4 w-4" />
                              {child.label}
                            </Button>
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    // 단독 메뉴
                    <Link key={item.href} href={item.href!} onClick={() => setOpen(false)}>
                      <Button
                        variant={location === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start",
                          location === item.href
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
