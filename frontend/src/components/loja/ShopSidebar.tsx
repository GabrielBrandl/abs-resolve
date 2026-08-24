import { NavLink } from 'react-router-dom';
import { CATEGORY_NAV, UNIQUE_CATEGORIES } from '../../storefront/constants';

export function ShopSidebar() {
  return (
    <aside className="hidden h-fit lg:block">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <p className="px-1 pb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Comprar por categoria</p>
        <nav className="space-y-1">
          {UNIQUE_CATEGORIES.map((c) => (
            <NavLink
              key={c.slug}
              to={`/c/${c.slug}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-2 py-2 text-sm transition ${
                  isActive ? 'bg-primary-50 font-bold text-primary-800' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <img src={c.image} alt="" className="h-11 w-11 rounded-2xl object-cover" />
              <span>{c.label === 'Instalações' ? 'Instalações e montagens' : c.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl bg-accent-500 p-4 text-primary-950">
        <p className="text-xs font-black uppercase">Oferta da visita</p>
        <p className="mt-1 text-sm font-semibold">Leve 2 serviços da mesma categoria e resolva de uma vez.</p>
      </div>
    </aside>
  );
}

export function CategoryPhotoChip({
  slug,
  label,
  image,
  active,
}: {
  slug: string;
  label: string;
  image: string;
  active?: boolean;
}) {
  return (
    <NavLink
      to={`/c/${slug}`}
      className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold ${
        active ? 'bg-primary-800 text-white' : 'bg-white text-primary-800 ring-1 ring-slate-200'
      }`}
    >
      <img src={image} alt="" className="h-8 w-8 rounded-full object-cover" />
      {label}
    </NavLink>
  );
}

export function CategoryPhotoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {CATEGORY_NAV.filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i).map((c) => (
        <NavLink
          key={c.label}
          to={`/c/${c.slug}`}
          className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <img src={c.image} alt={c.label} className="h-24 w-full object-cover transition group-hover:scale-105" />
          <p className="px-2 py-2 text-center text-xs font-black text-primary-900">{c.label}</p>
        </NavLink>
      ))}
    </div>
  );
}
