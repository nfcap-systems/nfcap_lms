'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme ?? cfg.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  label,
  nameKey,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number | string;
    name?: string;
    dataKey?: string;
    color?: string;
    payload?: unknown;
  }>;
  className?: string;
  indicator?: 'line' | 'dot' | 'dashed';
  hideLabel?: boolean;
  label?: React.ReactNode;
  nameKey?: string;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!hideLabel && label ? <div className="font-medium">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
          const itemConfig = config[key];
          const indicatorColor = item.color;

          return (
            <div key={index} className="flex w-full flex-wrap items-center gap-2">
              <div
                className={cn(
                  'shrink-0 rounded-[2px]',
                  indicator === 'dot' ? 'h-2.5 w-2.5' : 'h-2.5 w-1',
                )}
                style={{ backgroundColor: indicatorColor }}
              />
              <div className="flex flex-1 items-center justify-between leading-none">
                <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                {item.value != null && (
                  <span className="ml-2 font-mono font-medium text-foreground tabular-nums">
                    {typeof item.value === 'number'
                      ? item.value.toLocaleString()
                      : String(item.value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  payload,
  nameKey,
}: {
  className?: string;
  payload?: ReadonlyArray<{ value?: string; dataKey?: string; color?: string }>;
  nameKey?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn('flex items-center justify-center gap-4 pt-3', className)}>
      {payload.map((item, index) => {
        const key = `${nameKey ?? item.dataKey ?? 'value'}`;
        const itemConfig = config[key];

        return (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
