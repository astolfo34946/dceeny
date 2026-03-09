import { Route, Routes } from 'react-router-dom';
import { BrandHeader } from '../components/BrandHeader';
import { CustomerDashboardHome } from './CustomerDashboardHome';
import { CustomerFactor } from './CustomerFactor';
import { Customer360Weeks } from './Customer360Weeks';
import { Customer360Viewer } from './Customer360Viewer';
import { Customer3D } from './Customer3D';

export function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <BrandHeader />
      <main className="flex-1">
        <Routes>
          <Route index element={<CustomerDashboardHome />} />
          <Route path="factor" element={<CustomerFactor />} />
          <Route path="360" element={<Customer360Weeks />} />
          <Route path="360/weeks/:weekId" element={<Customer360Viewer />} />
          <Route path="3d" element={<Customer3D />} />
        </Routes>
      </main>
    </div>
  );
}
