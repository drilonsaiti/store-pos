'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopProductPoint } from '@/lib/utils/analytics';

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TopProductPoint }> }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
            <p className="text-muted-foreground">{point.name}</p>
            <p className="tabular font-semibold">{point.quantity} sold</p>
        </div>
    );
}

export function TopProductsChart({ data }: { data: TopProductPoint[] }) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Top products</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                    Sell a few products to see your best sellers here.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top products by units sold</CardTitle>
            </CardHeader>
            <CardContent className="h-64 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            width={100}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}