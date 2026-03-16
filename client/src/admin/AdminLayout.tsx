import { Route, Routes, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '../components/BrandHeader';
import { AdminDashboardHome } from './AdminDashboardHome';
import { AdminProjects } from './AdminProjects';
import { AdminProjectWeeks } from './AdminProjectWeeks';
import { AdminFactor } from './AdminFactor';
import { AdminCustomers } from './AdminCustomers';
import { AdminInvoiceSettings } from './AdminInvoiceSettings';
import { Admin3DProjects } from './Admin3DProjects';
import { Admin3DProjectScenes } from './Admin3DProjectScenes';
import { Admin3DProjectGallery } from './Admin3DProjectGallery';

export function AdminLayout() {
  const { t } = useTranslation();

  const navItems = [
    { path: '', label: t('admin_nav_dashboard') },
    { path: 'projects', label: t('admin_nav_projects') },
    { path: '3d', label: t('admin_nav_3d') },
    { path: 'customers', label: t('admin_nav_customers') },
    { path: 'settings', label: t('admin_nav_settings') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-black">
      <BrandHeader />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white md:block">
          <nav className="flex flex-col gap-0.5 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path || 'home'}
                to={item.path ? `/admin/${item.path}` : '/admin'}
                end={!item.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex-1 overflow-auto">
          <main className="min-h-full px-4 py-6 md:px-6">
            <Routes>
              <Route index element={<AdminDashboardHome />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="projects/:projectId/weeks" element={<AdminProjectWeeks />} />
              <Route path="3d" element={<Admin3DProjects />} />
              <Route path="3d/:projectId/scenes" element={<Admin3DProjectScenes />} />
              <Route path="3d/:projectId/gallery" element={<Admin3DProjectGallery />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="customers/:customerId/factor" element={<AdminFactor />} />
              <Route path="settings" element={<AdminInvoiceSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
