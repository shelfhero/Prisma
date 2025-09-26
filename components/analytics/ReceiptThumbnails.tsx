'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReceiptThumbnail } from '@/types/analytics';
import { Image, Eye, Download, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

interface ReceiptThumbnailsProps {
  data: ReceiptThumbnail[];
  loading?: boolean;
  onImageClick?: (receipt: ReceiptThumbnail) => void;
  onDownload?: (receipt: ReceiptThumbnail) => void;
  showMetadata?: boolean;
  compact?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

function getProcessingStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function getProcessingStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-50';
    case 'failed':
      return 'text-red-700 bg-red-50';
    case 'pending':
      return 'text-yellow-700 bg-yellow-50';
    default:
      return 'text-gray-700 bg-gray-50';
  }
}

interface ThumbnailCardProps {
  receipt: ReceiptThumbnail;
  onImageClick?: (receipt: ReceiptThumbnail) => void;
  onDownload?: (receipt: ReceiptThumbnail) => void;
  showMetadata?: boolean;
  compact?: boolean;
}

function ThumbnailCard({ receipt, onImageClick, onDownload, showMetadata = true, compact = false }: ThumbnailCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  if (compact) {
    return (
      <div className="relative group cursor-pointer" onClick={() => onImageClick?.(receipt)}>
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
          {imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Грешка при зареждането</p>
              </div>
            </div>
          ) : (
            <>
              {imageLoading && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse">
                    <Image className="w-8 h-8 text-gray-300" />
                  </div>
                </div>
              )}
              <img
                src={receipt.thumbnailUrl}
                alt={`Receipt ${receipt.receiptId}`}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`text-xs ${getProcessingStatusColor(receipt.processingStatus)}`}>
            {getProcessingStatusIcon(receipt.processingStatus)}
          </Badge>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-100">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Грешка при зареждането</p>
              <p className="text-xs text-gray-400 mt-1">Файлът може да е повреден</p>
            </div>
          </div>
        ) : (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-pulse">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              </div>
            )}
            <img
              src={receipt.thumbnailUrl}
              alt={`Receipt ${receipt.receiptId}`}
              className={`w-full h-full object-cover cursor-pointer transition-all duration-300 hover:scale-105 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={() => onImageClick?.(receipt)}
            />
          </>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`text-xs ${getProcessingStatusColor(receipt.processingStatus)}`}>
            {getProcessingStatusIcon(receipt.processingStatus)}
            <span className="ml-1">
              {receipt.processingStatus === 'completed' ? 'Обработена' :
               receipt.processingStatus === 'failed' ? 'Грешка' :
               'Обработва се'}
            </span>
          </Badge>
        </div>

        {/* OCR Confidence */}
        {receipt.ocrConfidence && receipt.ocrConfidence > 0 && (
          <div className="absolute top-2 left-2">
            <Badge className={`text-xs ${
              receipt.ocrConfidence >= 90 ? 'text-green-700 bg-green-50' :
              receipt.ocrConfidence >= 70 ? 'text-yellow-700 bg-yellow-50' :
              'text-red-700 bg-red-50'
            }`}>
              OCR: {receipt.ocrConfidence}%
            </Badge>
          </div>
        )}
      </div>

      {/* Metadata */}
      {showMetadata && (
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-medium text-gray-900 truncate">
              Receipt #{receipt.receiptId.slice(-6)}
            </div>
            <div className="text-xs text-gray-500">
              {formatBulgarianDate(receipt.uploadedAt)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            <div>
              <span className="text-gray-400">Размери:</span>
              <div>{receipt.width} × {receipt.height}</div>
            </div>
            <div>
              <span className="text-gray-400">Размер:</span>
              <div>{formatFileSize(receipt.fileSize)}</div>
            </div>
            <div>
              <span className="text-gray-400">Формат:</span>
              <div>{receipt.mimeType.split('/')[1].toUpperCase()}</div>
            </div>
            <div>
              <span className="text-gray-400">ID:</span>
              <div className="truncate">{receipt.imageId.slice(-8)}</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onImageClick?.(receipt)}
              className="text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Преглед
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDownload?.(receipt)}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Изтегли
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ReceiptThumbnails({
  data,
  loading = false,
  onImageClick,
  onDownload,
  showMetadata = true,
  compact = false
}: ReceiptThumbnailsProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  const filteredData = data.filter(receipt => {
    if (filter === 'all') return true;
    return receipt.processingStatus === filter;
  });

  const statusCounts = {
    all: data.length,
    completed: data.filter(r => r.processingStatus === 'completed').length,
    pending: data.filter(r => r.processingStatus === 'pending').length,
    failed: data.filter(r => r.processingStatus === 'failed').length
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className={`grid gap-4 ${
            compact ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={compact ? 'aspect-square bg-gray-200 rounded' : 'h-64 bg-gray-200 rounded'}></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Няма качени снимки
          </h3>
          <p className="text-gray-500">
            Качете касови бележки за да видите техните снимки тук.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!compact && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📸 Снимки на касови бележки
              </h3>
              <p className="text-sm text-gray-600">
                Преглед и управление на качените снимки от бележки
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {data.length} снимки
            </Badge>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Филтър:</span>
            <div className="flex gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  size="sm"
                  variant={filter === status ? 'default' : 'outline'}
                  onClick={() => setFilter(status as any)}
                  className="text-xs"
                >
                  {status === 'all' ? 'Всички' :
                   status === 'completed' ? 'Обработени' :
                   status === 'pending' ? 'Обработват се' :
                   'С грешки'}
                  <span className="ml-1">({count})</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Успешни</span>
              </div>
              <div className="text-lg font-bold text-green-900">{statusCounts.completed}</div>
              <div className="text-xs text-green-600">
                {((statusCounts.completed / statusCounts.all) * 100).toFixed(1)}% от всички
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">В процес</span>
              </div>
              <div className="text-lg font-bold text-yellow-900">{statusCounts.pending}</div>
              <div className="text-xs text-yellow-600">
                {((statusCounts.pending / statusCounts.all) * 100).toFixed(1)}% от всички
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Грешки</span>
              </div>
              <div className="text-lg font-bold text-red-900">{statusCounts.failed}</div>
              <div className="text-xs text-red-600">
                {((statusCounts.failed / statusCounts.all) * 100).toFixed(1)}% от всички
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Общо размер</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatFileSize(data.reduce((sum, r) => sum + r.fileSize, 0))}
              </div>
              <div className="text-xs text-blue-600">
                Всички файлове
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Thumbnails Grid */}
      <div className={`grid gap-4 ${
        compact
          ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`}>
        {filteredData.map((receipt) => (
          <ThumbnailCard
            key={receipt.imageId}
            receipt={receipt}
            onImageClick={onImageClick}
            onDownload={onDownload}
            showMetadata={showMetadata}
            compact={compact}
          />
        ))}
      </div>

      {filteredData.length === 0 && filter !== 'all' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <X className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Няма резултати
            </h4>
            <p className="text-gray-500">
              Няма снимки с избрания статус: {
                filter === 'completed' ? 'Обработени' :
                filter === 'pending' ? 'Обработват се' :
                'С грешки'
              }
            </p>
            <Button
              variant="ghost"
              onClick={() => setFilter('all')}
              className="mt-2"
            >
              Покажи всички
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}