'use client';

import Image from 'next/image';
import { Calendar, Clock, Globe2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIntegrationBrandImage } from '../integrationBrandImages';

const FALLBACK_ICONS: Record<string, typeof Settings> = {
  http_webhook: Globe2,
  webhook: Globe2,
  schedule: Clock,
  zoom: Calendar,
};

type IntegrationBrandImageProps = {
  provider: string;
  size?: number;
  className?: string;
};

export function IntegrationBrandImage({
  provider,
  size = 20,
  className,
}: IntegrationBrandImageProps) {
  const src = getIntegrationBrandImage(provider);

  if (src) {
    return (
      <div
        className={cn('relative shrink-0', className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain"
          aria-hidden
        />
      </div>
    );
  }

  const Fallback = FALLBACK_ICONS[provider] ?? Settings;
  return (
    <Fallback
      className={cn('shrink-0 text-zinc-500', className)}
      size={size}
      strokeWidth={2}
      aria-hidden
    />
  );
}
