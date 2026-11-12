import { NavLink } from "react-router-dom";
import { ShoppingBag, Bot, Scale, Sparkles, CreditCard, History } from "lucide-react";

const links = [
  { to: "/", label: "Home", icon: ShoppingBag },
  { to: "/assistant", label: "Assistant", icon: Bot },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/compare", label: "Compare", icon: Scale },
  { to: "/recommendations", label: "Picks", icon: Sparkles },
  { to: "/checkout", label: "Checkout", icon: CreditCard },
  { to: "/orders", label: "Orders", icon: History },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_35%),radial-gradient(circle_at_right,_rgba(139,92,246,0.2),_transparent_30%)]" />
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-lg font-bold gradient-text">ShopPilot AI</div>
            <div className="text-xs text-slate-400">Shop Smarter. Decide Better. Pay Securely.</div>
          </div>
          <nav className="hidden gap-1 md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-blue-600/20 text-blue-300" : "text-slate-300 hover:bg-slate-800/60"}`}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
