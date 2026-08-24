import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
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
  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <CartToasts />
      <StoreHeader showCategories={showCategories} />
      <div className="mx-auto grid min-h-[60vh] w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16.5rem_1fr]">
        <ShopSidebar />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}
