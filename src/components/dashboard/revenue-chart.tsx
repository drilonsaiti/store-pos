'use client';

import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {DailyRevenuePoint} from '@/lib/utils/analytics';
import {useFormatCurrency} from '@/hooks/use-currency';

function ChartTooltip({
                          active,
                          payload,
                          fmt,
                      }: {
    active?: boolean;
    payload?: Array<{ payload: DailyRevenuePoint }>;
    fmt: (value: number) => string;
}) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
            <p className="text-muted-foreground">{point.label}</p>
            <p className="tabular font-semibold">{fmt(point.revenue)}</p>
        </div>
    );
}

export function RevenueChart({data}: { data: DailyRevenuePoint[] }) {
    const fmt = useFormatCurrency();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue — last 14 days</CardTitle>
            </CardHeader>
            <CardContent className="h-64 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{top: 4, right: 4, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                        <XAxis
                            dataKey="label"
                            tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                            axisLine={{stroke: 'hsl(var(--border))'}}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                            axisLine={false}
                            tickLine={false}
                            width={44}
                        />
                        <Tooltip content={<ChartTooltip fmt={fmt}/>} cursor={{fill: 'hsl(var(--secondary))'}}/>
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28}/>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}