'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function BaseNode({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-white text-slate-900 relative rounded-md border border-slate-200',
        'hover:ring-1 hover:ring-slate-300',
        'shadow-sm transition-shadow',
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}

export function BaseNodeHeader({
  className,
  ...props
}: ComponentProps<'header'>) {
  return (
    <header
      {...props}
      className={cn(
        'flex flex-row items-center justify-between gap-2 px-3 py-2',
        className,
      )}
    />
  );
}

export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('select-none flex-1 text-sm font-semibold', className)}
      {...props}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-y-2 px-3 py-2', className)}
      {...props}
    />
  );
}

export function BaseNodeFooter({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-y-2 border-t border-slate-200 px-3 pt-2 pb-3',
        className,
      )}
      {...props}
    />
  );
}
