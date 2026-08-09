import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, ScanBarcode, Receipt, Settings } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/sale', label: 'POS', icon: ScanBarcode },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav swaps Settings for a compact "More" — kept to 5 max touch targets.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/sale', label: 'POS', icon: ScanBarcode },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/settings', label: 'More', icon: Settings },
];
