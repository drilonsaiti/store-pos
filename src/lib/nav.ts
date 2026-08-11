import type {LucideIcon} from 'lucide-react';
import {LayoutDashboard, Package, Receipt, ScanBarcode, Settings} from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
    {href: '/', label: 'Dashboard', icon: LayoutDashboard},
    {href: '/products', label: 'Products', icon: Package},
    {href: '/sale', label: 'POS', icon: ScanBarcode},
    {href: '/sales', label: 'Sales', icon: Receipt},
    {href: '/settings', label: 'Settings', icon: Settings},
];

// Mobile bottom nav swaps Settings for a compact "More" — kept to 5 max touch targets.
export const MOBILE_NAV_ITEMS: NavItem[] = [
    {href: '/', label: 'Home', icon: LayoutDashboard},
    {href: '/products', label: 'Products', icon: Package},
    {href: '/sale', label: 'POS', icon: ScanBarcode},
    {href: '/sales', label: 'Sales', icon: Receipt},
    {href: '/settings', label: 'More', icon: Settings},
];

/**
 * Exact-segment route matching — plain `pathname.startsWith(href)` wrongly
 * marks "/sale" (POS) as active while on "/sales", since "/sales" starts
 * with "/sale". A match only counts if the pathname is the href exactly, or
 * continues with a "/" (a real sub-route), never mid-word.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
}