'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Info,
  Lightbulb,
  Target,
  TrendingUp,
  ShoppingCart,
  Zap
} from 'lucide-react';

export default function ReceiptReviewGuide() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Info className="w-5 h-5" />
          Как да използвате прегледа на касовата бележка
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Стъпки за преглед:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600">1.</span>
                <span>Прегледайте информацията за магазина и общата сума</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600">2.</span>
                <span>Проверете разпознатите продукти и цени</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600">3.</span>
                <span>Редактирайте неправилно разпознати елементи</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600">4.</span>
                <span>Категоризирайте всички продукти</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600">5.</span>
                <span>Запазете в бюджета</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Категории в бюджета:
            </h4>
            <div className="space-y-2">
              <Badge variant="outline" className="text-green-700 border-green-300">
                🍎 Основни храни - хляб, мляко, месо, зеленчуци
              </Badge>
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                🍕 Готови храни - готови ястия, замразени храни
              </Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                🍺 Напитки - води, сокове, алкохол, кафе
              </Badge>
              <Badge variant="outline" className="text-purple-700 border-purple-300">
                🍭 Закуски - бонбони, чипс, сладкиши
              </Badge>
              <Badge variant="outline" className="text-gray-700 border-gray-300">
                🧴 Нехранителни - козметика, битова химия
              </Badge>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border-t pt-4">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            Полезни функции:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium">Автоматично категоризиране</span>
                <p className="text-gray-600">Използва AI за предлагане на категории</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <span className="font-medium">Преглед на сумите</span>
                <p className="text-gray-600">Проследява разпределението по категории</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <span className="font-medium">Групови операции</span>
                <p className="text-gray-600">Приложи категория към всички продукти наведнъж</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold flex items-center gap-2 text-yellow-800 mb-2">
            <Lightbulb className="w-4 h-4" />
            Съвети за най-добри резултати:
          </h4>
          <ul className="space-y-1 text-sm text-yellow-700">
            <li>• Проверете дали общата сума се сверява с категоризираните продукти</li>
            <li>• Използвайте бутона за редактиране ако OCR е разпознал грешно продукт</li>
            <li>• Започнете с автоматичното категоризиране и след това направете корекции</li>
            <li>• Ако има разлика в сумите, проверете количествата и цените</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}