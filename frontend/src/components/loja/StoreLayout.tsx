import { Outlet } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { WhatsAppFab } from './store-ui';

export function StoreLayout({ showCategories = true }: { showCategories?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <StoreHeader showCategories={showCategories} />
      <main className="mx-auto min-h-[60vh] w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}
