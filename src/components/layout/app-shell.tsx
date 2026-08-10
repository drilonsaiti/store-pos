import {Sidebar} from './sidebar';
import {MobileNav} from './mobile-nav';
import {Topbar} from './topbar';
import {OfflineBanner} from './offline-banner';
import {RequireAuth} from '@/components/auth/require-auth';

export function AppShell({title, children}: { title: string; children: React.ReactNode }) {
    return (
        <RequireAuth>
            <a href="#main-content" className="skip-link">
                Skip to content
            </a>
            <div className="flex min-h-dvh">
                <Sidebar/>
                <div className="flex min-w-0 flex-1 flex-col">
                    <Topbar title={title}/>
                    <OfflineBanner/>
                    <main id="main-content" tabIndex={-1} className="flex-1 pb-20 md:pb-6 focus:outline-none">
                        {children}
                    </main>
                    <MobileNav/>
                </div>
            </div>
        </RequireAuth>
    );
}