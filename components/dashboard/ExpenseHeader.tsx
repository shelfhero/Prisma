'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DashboardHeaderProps, DashboardStats, DashboardFilters } from '@/types/dashboard';
import { CalendarDays, PlusCircle, Settings, Download, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const BULGARIAN_MONTHS = [
  { value: 1, label: 'Януари' },
  { value: 2, label: 'Февруари' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Април' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Юни' },
  { value: 7, label: 'Юли' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Септември' },
  { value: 10, label: 'Октомври' },
  { value: 11, label: 'Ноември' },
  { value: 12, label: 'Декември' },
];

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

function formatBulgarianNumber(num: number): string {
  return new Intl.NumberFormat('bg-BG').format(num);
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  color?: 'default' | 'green' | 'red' | 'blue';
}

function StatsCard({ icon, title, value, subtitle, trend, color = 'default' }: StatsCardProps) {
  const colorClasses = {
    default: 'border-gray-200 bg-white',
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
  };

  return (
    <Card className={`p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 text-gray-600">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {trend.direction === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
            {trend.direction === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
            {trend.direction === 'neutral' && <Minus className="w-4 h-4 text-gray-400" />}
            <span className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-600' :
              trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function ExpenseHeader({
  stats,
  filters,
  onFiltersChange,
  onAddExpense,
  onEditBudget,
  onExportData
}: DashboardHeaderProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const monthName = BULGARIAN_MONTHS.find(m => m.value === filters.month)?.label || 'Неизвестен';
  const budgetPercentage = stats.monthlyBudget ? (stats.budgetUsed / stats.monthlyBudget) * 100 : 0;
  const budgetStatus = budgetPercentage > 90 ? 'danger' : budgetPercentage > 75 ? 'warning' : 'good';

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ searchQuery: value });
  };

  const handleMonthChange = (month: string) => {
    onFiltersChange({ month: parseInt(month), currentPage: 1 });
  };

  const handleYearChange = (year: string) => {
    onFiltersChange({ year: parseInt(year), currentPage: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Призма - Табло за разходи
          </h1>
          <p className="text-gray-600 mt-1">
            Детайлен преглед на разходите за {monthName} {filters.year} г.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onAddExpense} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            Добави разход
          </Button>
          <Button variant="outline" onClick={onEditBudget}>
            <Settings className="w-4 h-4 mr-2" />
            Редактирай бюджет
          </Button>
          <Button variant="outline" onClick={onExportData}>
            <Download className="w-4 h-4 mr-2" />
            Експортирай данни
          </Button>
        </div>
      </div>

      <Separator />

      {/* Month/Year Selector and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          <Select value={filters.month.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULGARIAN_MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Търси продукти, магазини..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">📄</div>}
          title="Общо касови бележки"
          value={formatBulgarianNumber(stats.totalReceipts)}
          subtitle={`${formatBulgarianNumber(stats.totalItems)} продукта`}
        />

        <StatsCard
          icon={<div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">💰</div>}
          title="Общо разходи"
          value={formatBulgarianCurrency(stats.totalSpent)}
          subtitle={`Средно ${formatBulgarianCurrency(stats.averagePerReceipt)} на бележка`}
        />

        <StatsCard
          icon={<div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">📊</div>}
          title="Бюджет за месеца"
          value={stats.monthlyBudget ? formatBulgarianCurrency(stats.monthlyBudget) : 'Няма'}
          subtitle={stats.monthlyBudget
            ? `Изразходван: ${budgetPercentage.toFixed(1)}% • ${budgetStatus === 'good' ? '✅ Добре' : budgetStatus === 'warning' ? '⚠️ Внимание' : '❌ Превишен'}`
            : 'Не е зададен бюджет'}
          color={budgetStatus === 'good' ? 'green' : budgetStatus === 'warning' ? 'blue' : 'red'}
        />

        <StatsCard
          icon={<div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">💳</div>}
          title="Остава от бюджета"
          value={stats.monthlyBudget ? formatBulgarianCurrency(stats.budgetRemaining) : 'N/A'}
          subtitle={stats.monthlyBudget ? (
            stats.budgetRemaining >= 0 ?
              `Можете да харчите още ${formatBulgarianCurrency(stats.budgetRemaining)}` :
              `Превишение с ${formatBulgarianCurrency(Math.abs(stats.budgetRemaining))}`
          ) : undefined}
          color={stats.budgetRemaining >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Budget Progress Bar (if budget is set) */}
      {stats.monthlyBudget && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Прогрес на бюджета за {monthName}
              </span>
              <span className="text-sm text-gray-500">
                {formatBulgarianCurrency(stats.budgetUsed)} / {formatBulgarianCurrency(stats.monthlyBudget)}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  budgetStatus === 'good' ? 'bg-green-500' :
                  budgetStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>0 лв</span>
              <span className={budgetPercentage > 100 ? 'text-red-600 font-bold' : ''}>
                {budgetPercentage.toFixed(1)}% изразходван
              </span>
              <span>{formatBulgarianCurrency(stats.monthlyBudget)}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}