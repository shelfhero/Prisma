'use client';

/**
 * Empty State - No Data
 * Generic empty state component with customizable message and CTA
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface NoDataEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  iconBgColor?: string;
  iconColor?: string;
  children?: React.ReactNode;
}

export default function NoDataEmpty({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  iconBgColor = 'bg-gradient-to-br from-gray-100 to-gray-200',
  iconColor = 'text-gray-600',
  children
}: NoDataEmptyProps) {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className={`w-20 h-20 ${iconBgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-10 h-10 ${iconColor}`} />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 mb-8">
          {description}
        </p>

        {/* CTA */}
        {(actionLabel && (actionHref || onAction)) && (
          <div className="mb-6">
            {actionHref ? (
              <Link href={actionHref}>
                <Button size="lg">
                  {actionLabel}
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        )}

        {/* Custom Children */}
        {children}
      </div>
    </Card>
  );
}
