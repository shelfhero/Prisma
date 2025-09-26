'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BudgetAlert, SmartRecommendation } from '@/types/analytics';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  Target,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  Settings,
  Lightbulb
} from 'lucide-react';

interface BudgetAlertsRecommendationsProps {
  alerts: BudgetAlert[];
  recommendations: SmartRecommendation[];
  loading?: boolean;
  onDismissAlert?: (alertId: string) => void;
  onMarkAlertRead?: (alertId: string) => void;
  onApplyRecommendation?: (recommendationId: string) => void;
  onViewCategory?: (category: string) => void;
}

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

function formatBulgarianDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getAlertIcon(type: string, severity: string = 'info') {
  const iconClass = severity === 'critical' ? 'w-5 h-5' : 'w-4 h-4';

  switch (type) {
    case 'approaching_limit':
      return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    case 'exceeded_budget':
      return <AlertCircle className={`${iconClass} text-red-500`} />;
    case 'unusual_spending':
      return <TrendingUp className={`${iconClass} text-orange-500`} />;
    case 'saving_opportunity':
      return <PiggyBank className={`${iconClass} text-green-500`} />;
    default:
      return <Info className={`${iconClass} text-blue-500`} />;
  }
}

function getAlertColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
}

function getAlertTextColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-800';
    case 'warning':
      return 'text-yellow-800';
    default:
      return 'text-blue-800';
  }
}

function getRecommendationIcon(type: string): string {
  switch (type) {
    case 'budget_optimization': return '🎯';
    case 'store_switching': return '🏪';
    case 'category_reduction': return '📉';
    case 'seasonal_adjustment': return '🌿';
    default: return '💡';
  }
}

function getRecommendationTypeText(type: string): string {
  switch (type) {
    case 'budget_optimization': return 'Оптимизация на бюджет';
    case 'store_switching': return 'Смяна на магазини';
    case 'category_reduction': return 'Намаление в категория';
    case 'seasonal_adjustment': return 'Сезонна корекция';
    default: return type;
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'text-green-700 bg-green-100';
    case 'hard':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-yellow-700 bg-yellow-100';
  }
}

function getDifficultyText(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'Лесно';
    case 'medium': return 'Средно';
    case 'hard': return 'Трудно';
    default: return difficulty;
  }
}

interface AlertCardProps {
  alert: BudgetAlert;
  onDismiss?: (alertId: string) => void;
  onMarkRead?: (alertId: string) => void;
  onViewCategory?: (category: string) => void;
}

function AlertCard({ alert, onDismiss, onMarkRead, onViewCategory }: AlertCardProps) {
  return (
    <Card className={`transition-all duration-200 border ${getAlertColor(alert.severity)} ${
      alert.isRead ? 'opacity-75' : ''
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.type, alert.severity)}
            <div className="flex-1">
              <div className={`font-semibold ${getAlertTextColor(alert.severity)} mb-1`}>
                {alert.message}
              </div>
              <div className={`text-sm ${getAlertTextColor(alert.severity)} opacity-75 mb-2`}>
                {alert.detailedMessage}
              </div>

              {/* Progress Bar for Budget Alerts */}
              {alert.budgetAmount && alert.percentage && (
                <div className="mb-3">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>Изразходвано</span>
                    <span>{alert.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        alert.percentage >= 100 ? 'bg-red-500' :
                        alert.percentage >= 80 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 text-gray-600">
                    <span>{formatBulgarianCurrency(alert.currentAmount)}</span>
                    <span>{formatBulgarianCurrency(alert.budgetAmount)}</span>
                  </div>
                </div>
              )}

              <div className={`text-sm ${getAlertTextColor(alert.severity)} font-medium mb-2`}>
                💡 {alert.recommendedAction}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                {formatBulgarianDate(alert.createdAt)}
                {alert.category && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {alert.category}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!alert.isRead && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead?.(alert.id)}
                className="text-xs p-1"
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss?.(alert.id)}
              className="text-xs p-1 text-red-600 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {alert.category && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewCategory?.(alert.category!)}
              className="text-xs"
            >
              Виж категория
            </Button>
          )}
          {!alert.isRead && (
            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
              Ново
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

interface RecommendationCardProps {
  recommendation: SmartRecommendation;
  onApply?: (recommendationId: string) => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

function RecommendationCard({ recommendation, onApply, showDetails, onToggleDetails }: RecommendationCardProps) {
  return (
    <Card className={`transition-all duration-200 ${
      recommendation.isApplied ? 'border-green-200 bg-green-50' : ''
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getRecommendationIcon(recommendation.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                <Badge className={`text-xs ${
                  recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                  recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {recommendation.priority === 'high' ? 'Висок приоритет' :
                   recommendation.priority === 'medium' ? 'Среден приоритет' :
                   'Нисък приоритет'}
                </Badge>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                {recommendation.description}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600 mb-1">Месечни спестявания</div>
                  <div className="text-lg font-bold text-green-700">
                    {formatBulgarianCurrency(recommendation.impact.potentialMonthlySaving)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">Доверие / Време</div>
                  <div className="text-sm font-semibold text-blue-700">
                    {recommendation.impact.confidence}% • {recommendation.impact.timeframe}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {getRecommendationTypeText(recommendation.type)}
                </Badge>
                {recommendation.category && (
                  <Badge variant="secondary" className="text-xs">
                    📂 {recommendation.category}
                  </Badge>
                )}
                <span>•</span>
                <Calendar className="w-3 h-3" />
                {formatBulgarianDate(recommendation.createdAt)}
                {recommendation.isApplied && (
                  <>
                    <span>•</span>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">Приложена</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Steps */}
        {showDetails && recommendation.steps.length > 0 && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Стъпки за изпълнение:</h5>
            <div className="space-y-3">
              {recommendation.steps.map((step, index) => (
                <div key={step.order} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                    {step.order}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{step.action}</span>
                      <Badge className={`text-xs ${getDifficultyColor(step.difficulty)}`}>
                        {getDifficultyText(step.difficulty)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{step.description}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>⏱️ {step.estimatedTime}</span>
                      <span>💰 {formatBulgarianCurrency(step.potentialSaving)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleDetails}
            className="text-xs"
          >
            {showDetails ? 'Скрий стъпки' : 'Покажи стъпки'}
          </Button>

          <div className="flex items-center gap-2">
            {!recommendation.isApplied && (
              <Button
                size="sm"
                onClick={() => onApply?.(recommendation.id)}
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Приложи препоръката
              </Button>
            )}
            {recommendation.isApplied && (
              <Badge className="text-xs bg-green-100 text-green-800">
                ✅ Приложена
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BudgetAlertsRecommendations({
  alerts,
  recommendations,
  loading = false,
  onDismissAlert,
  onMarkAlertRead,
  onApplyRecommendation,
  onViewCategory
}: BudgetAlertsRecommendationsProps) {
  const [alertFilter, setAlertFilter] = useState<'all' | 'unread' | 'critical'>('unread');
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());

  const toggleRecommendationDetails = (recommendationId: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(recommendationId)) {
      newExpanded.delete(recommendationId);
    } else {
      newExpanded.add(recommendationId);
    }
    setExpandedRecommendations(newExpanded);
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (alertFilter) {
      case 'unread':
        return !alert.isRead && !alert.isDismissed;
      case 'critical':
        return alert.severity === 'critical' && !alert.isDismissed;
      default:
        return !alert.isDismissed;
    }
  });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.isDismissed);
  const unreadAlerts = alerts.filter(a => !a.isRead && !a.isDismissed);
  const totalSavings = recommendations.reduce((sum, r) => sum + r.impact.potentialMonthlySaving, 0);
  const appliedRecommendations = recommendations.filter(r => r.isApplied);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚨 Бюджетни известия и препоръки
            </h3>
            <p className="text-sm text-gray-600">
              Автоматични известия за бюджета и интелигентни препоръки за спестявания
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-100 text-red-800">
              {criticalAlerts.length} критични
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              {unreadAlerts.length} нови
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">Критични известия</span>
            </div>
            <div className="text-lg font-bold text-red-900">{criticalAlerts.length}</div>
            <div className="text-sm text-red-600">
              Изискват незабавно внимание
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Непрочетени</span>
            </div>
            <div className="text-lg font-bold text-yellow-900">{unreadAlerts.length}</div>
            <div className="text-sm text-yellow-600">
              от {alerts.length} общо известия
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Потенциални спестявания</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatBulgarianCurrency(totalSavings)}
            </div>
            <div className="text-sm text-green-600">
              месечно при оптимизация
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Приложени препоръки</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{appliedRecommendations.length}</div>
            <div className="text-sm text-blue-600">
              от {recommendations.length} общо
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">📢 Бюджетни известия</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Филтър:</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={alertFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setAlertFilter('all')}
                className="text-xs"
              >
                Всички ({alerts.filter(a => !a.isDismissed).length})
              </Button>
              <Button
                size="sm"
                variant={alertFilter === 'unread' ? 'default' : 'outline'}
                onClick={() => setAlertFilter('unread')}
                className="text-xs"
              >
                Непрочетени ({unreadAlerts.length})
              </Button>
              <Button
                size="sm"
                variant={alertFilter === 'critical' ? 'default' : 'outline'}
                onClick={() => setAlertFilter('critical')}
                className="text-xs"
              >
                Критични ({criticalAlerts.length})
              </Button>
            </div>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                🎉 Няма активни известия!
              </h4>
              <p className="text-gray-500">
                {alertFilter === 'critical' ? 'Няма критични известия.' :
                 alertFilter === 'unread' ? 'Всички известия са прочетени.' :
                 'Всички известия са обработени.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={onDismissAlert}
                onMarkRead={onMarkAlertRead}
                onViewCategory={onViewCategory}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">💡 Интелигентни препоръки</h4>
          <Badge className="bg-purple-100 text-purple-800">
            {recommendations.length} препоръки
          </Badge>
        </div>

        {recommendations.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Няма препоръки засега
              </h4>
              <p className="text-gray-500">
                Добавете повече данни за да получите персонализирани препоръки за спестяване.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onApply={onApplyRecommendation}
                showDetails={expandedRecommendations.has(recommendation.id)}
                onToggleDetails={() => toggleRecommendationDetails(recommendation.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Insights */}
      {(criticalAlerts.length > 0 || totalSavings > 0) && (
        <Card className="p-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <div className="text-indigo-600 mt-0.5">📊</div>
              <div>
                <div className="text-sm font-medium text-indigo-900 mb-1">
                  Обобщение за бюджета:
                </div>
                <div className="text-xs text-indigo-700 space-y-1">
                  {criticalAlerts.length > 0 && (
                    <p>
                      ⚠️ Имате {criticalAlerts.length} критични известия{criticalAlerts.length === 1 ? '' : 'я'}
                      за бюджета, които изискват незабавно внимание.
                    </p>
                  )}
                  {totalSavings > 0 && (
                    <p>
                      💰 Следвайки препоръките, можете да спестите до {formatBulgarianCurrency(totalSavings)}
                      месечно ({formatBulgarianCurrency(totalSavings * 12)} годишно).
                    </p>
                  )}
                  {appliedRecommendations.length > 0 && (
                    <p>
                      ✅ Вече сте приложили {appliedRecommendations.length} препоръки{appliedRecommendations.length === 1 ? '' : 'и'}.
                      Продължавайте така!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}