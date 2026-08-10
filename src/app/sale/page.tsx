import {AppShell} from '@/components/layout/app-shell';
import {PosScreen} from '@/components/pos/pos-screen';

export default function SalePage() {
    return (
        <AppShell title="New Sale">
            <PosScreen/>
        </AppShell>
    );
}
