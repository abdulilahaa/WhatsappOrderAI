import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Package, ShoppingCart, MessageCircle, Bot, MessageSquare, TestTube, Calendar, Settings, Database, CheckCircle, Activity, Users } from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Products", href: "/products", icon: Package },
  { name: "Staff Availability", href: "/staff-availability", icon: Users },
  { name: "Service Analytics", href: "/service-analytics", icon: BarChart3 },
  { name: "Conversations", href: "/conversations", icon: MessageCircle },
  { name: "Integration Hub", href: "/integration-dashboard", icon: Activity },
  { name: "AI Agent Settings", href: "/ai-agent-settings", icon: Settings },
  { name: "WhatsApp Setup", href: "/whatsapp-setup", icon: MessageSquare },
];

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className={cn("w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col", className)}>
      {/* Logo Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-whatsapp rounded-xl flex items-center justify-center">
            <i className="fab fa-whatsapp text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">OrderBot AI</h1>
            <p className="text-xs text-slate-500">WhatsApp Ordering</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <span className={cn(
                    "flex items-center px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer",
                    isActive
                      ? "text-whatsapp bg-whatsapp/10"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  )}>
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-ai rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@business.com</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
