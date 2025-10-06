'use client';

/**
 * Empty State - No Receipts Yet
 * Friendly empty state for users who haven't uploaded any receipts
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, FileText } from 'lucide-react';
import Link from 'next/link';

export default function NoReceiptsEmpty() {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="w-10 h-10 text-blue-600" />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Все още нямате касови бонове
        </h3>
        <p className="text-gray-600 mb-8">
          Качете първия си касов бон за да започнете да проследявате разходите си 📸
        </p>

        {/* CTA */}
        <Link href="/upload-receipt">
          <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Upload className="w-5 h-5 mr-2" />
            Качете първия си бон
          </Button>
        </Link>

        {/* Helper Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 text-sm mb-1">Как работи?</h4>
              <ol className="text-xs text-gray-600 space-y-1">
                <li>1. Направете снимка на касовия бон или изберете от галерията</li>
                <li>2. AI автоматично разпознава продуктите и цените</li>
                <li>3. Прегледайте и потвърдете информацията</li>
                <li>4. Готово! Следете разходите си в реално време</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
