"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Disc3,
  CalendarDays,
  DollarSign,
  Music,
} from "lucide-react";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Today Hub", url: "/today", icon: CalendarDays },
  { title: "Artists", url: "/artists", icon: Users },
  { title: "Releases", url: "/releases", icon: Disc3 },
  { title: "Works", url: "/works", icon: Music },
  { title: "Budget", url: "/budget", icon: DollarSign },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <a href="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <span className="text-lg font-semibold tracking-tight">Label Suite</span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="flex items-center gap-2" data-href={item.url}>
                    <a href={item.url} className="flex items-center gap-2 no-underline">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
