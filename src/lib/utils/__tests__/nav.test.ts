import { describe, it, expect } from 'vitest';
import {isNavItemActive} from "../../nav";

describe('isNavItemActive', () => {
    it('matches the dashboard route only on exact "/"', () => {
        expect(isNavItemActive('/', '/')).toBe(true);
        expect(isNavItemActive('/products', '/')).toBe(false);
    });

    it('does NOT treat "/sales" as active for the "/sale" nav item — regression test for the original bug', () => {
        expect(isNavItemActive('/sales', '/sale')).toBe(false);
        expect(isNavItemActive('/sale', '/sale')).toBe(true);
    });

    it('matches a genuine sub-route', () => {
        expect(isNavItemActive('/products/123/edit', '/products')).toBe(true);
        expect(isNavItemActive('/products', '/products')).toBe(true);
    });

    it('does not match an unrelated route sharing no path boundary', () => {
        expect(isNavItemActive('/productsomethingelse', '/products')).toBe(false);
    });
});