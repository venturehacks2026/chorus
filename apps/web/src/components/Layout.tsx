import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, GitBranch } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function Layout() {
  return (
    <div className="flex h-screen bg-canvas-bg">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 gap-2 bg-node-bg border-r border-node-border">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4">
          <GitBranch className="w-5 h-5 text-white" />
        </div>

        <NavLink
          to="/workflows"
          className={({ isActive }) =>
            cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              isActive
                ? 'bg-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-node-border',
            )
          }
          title="Workflows"
        >
          <LayoutDashboard className="w-5 h-5" />
        </NavLink>

        <NavLink
          to="/marketplace"
          className={({ isActive }) =>
            cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              isActive
                ? 'bg-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-node-border',
            )
          }
          title="Marketplace"
        >
          <Store className="w-5 h-5" />
        </NavLink>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
