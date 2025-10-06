'use client';

/**
 * Empty State - No Budget Created
 * Friendly empty state for users who haven't created a budget
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PiggyBank, Target, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

export default function NoBudgetEmpty() {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <PiggyBank className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Създайте бюджет за да започнете следене
        </h3>
        <p className="text-gray-600 mb-8">
          Задайте месечни лимити по категории и следете къде отиват парите ви 💰
        </p>

        {/* CTA */}
        <Link href="/budget">
          <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
            <Plus className="w-5 h-5 mr-2" />
            Създайте бюджет
          </Button>
        </Link>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-1 gap-4 text-left">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  Задайте цели
                </h4>
                <p className="text-xs text-gray-600">
                  Определете месечни лимити за различни категории разходи
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  Следете прогреса
                </h4>
                <p className="text-xs text-gray-600">
                  Виждайте в реално време колко от бюджета си сте използвали
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
