import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { ShopSidebar } from './ShopSidebar';
import { WhatsAppFab } from './store-ui';
import { useToast } from '../Toast';
import { onCartChange } from '../../store/cartStore';

function CartToasts() {
  const { toast } = useToast();
  useEffect(() => onCartChange((msg) => toast(msg, 'success')), [toast]);
  return null;
}

export function StoreLayout({ showCategories = true }: { showCategories?: boolean }) {
  const { pathname } = useLocation();
  const withSidebar = pathname.startsWith('/c/') || pathname.startsWith('/busca');

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      <CartToasts />
      <StoreHeader showCategories={showCategories} />
      {withSidebar ? (
        <div className="mx-auto grid min-h-[60vh] w-full max-w-[1180px] gap-5 px-4 py-4 lg:grid-cols-[13.5rem_1fr]">
          <ShopSidebar />
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="mx-auto min-h-[60vh] w-full max-w-[1180px] px-4 py-4">
          <Outlet />
        </main>
      )}
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}
