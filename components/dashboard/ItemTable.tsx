'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ItemTableProps, DetailedReceiptItem } from '@/types/dashboard';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Eye,
  ArrowUpDown,
  Store,
  Calendar,
  Package,
  Receipt
} from 'lucide-react';

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
    year: 'numeric'
  });
}

function formatBulgarianDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatQuantity(quantity: number, unit: string | null): string {
  const formattedQty = new Intl.NumberFormat('bg-BG').format(quantity);
  return unit ? `${formattedQty} ${unit}` : `${formattedQty} бр.`;
}

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

function SortableHeader({ children, sortKey, currentSort, currentOrder, onSort, className }: SortableHeaderProps) {
  const isSorted = currentSort === sortKey;

  return (
    <TableHead className={`cursor-pointer hover:bg-gray-50 ${className}`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          {isSorted ? (
            currentOrder === 'asc' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </div>
    </TableHead>
  );
}

interface ItemRowProps {
  item: DetailedReceiptItem;
  onEdit: (item: DetailedReceiptItem) => void;
  onDelete: (itemId: string) => void;
  showReceipt: (receiptId: string) => void;
}

function ItemRow({ item, onEdit, onDelete, showReceipt }: ItemRowProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <TableRow
      className="hover:bg-gray-50 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium">{item.storeName}</div>
            {item.receiptNumber && (
              <div className="text-xs text-gray-500">
                №{item.receiptNumber}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium">{formatBulgarianDate(item.purchaseDate)}</div>
            <div className="text-xs text-gray-500">
              {formatBulgarianDateTime(item.purchaseDate).split(' ')[1]}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium max-w-xs truncate" title={item.productName}>
              {item.productName}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.categoryName}
            </Badge>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="font-medium">
          {formatQuantity(item.quantity, item.unit)}
        </div>
        <div className="text-xs text-gray-500">
          {formatBulgarianCurrency(item.unitPrice)} за единица
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="font-bold text-lg">
          {formatBulgarianCurrency(item.totalPrice)}
        </div>
        {item.quantity > 1 && (
          <div className="text-xs text-gray-500">
            {item.quantity} × {formatBulgarianCurrency(item.unitPrice)}
          </div>
        )}
      </TableCell>

      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => showReceipt(item.receiptId)}
          className="text-blue-600 hover:text-blue-700"
        >
          <Receipt className="w-4 h-4 mr-1" />
          Виж
        </Button>
      </TableCell>

      <TableCell className="text-right">
        <div className={`transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ItemTable({
  items,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  showReceipt
}: ItemTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [localSearch, setLocalSearch] = useState('');

  // Filter items based on local search
  const filteredItems = items.filter(item =>
    item.productName.toLowerCase().includes(localSearch.toLowerCase()) ||
    item.storeName.toLowerCase().includes(localSearch.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Няма продукти в тази категория
        </h3>
        <p className="text-gray-500">
          Няма записани продукти за избрания период или филтри.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Търси в таблицата..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-64"
          />
          <Badge variant="secondary" className="text-sm">
            {filteredItems.length} от {items.length} продукта
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Покажи:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">реда</span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <SortableHeader
                sortKey="storeName"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="w-1/6"
              >
                <Store className="w-4 h-4 mr-1" />
                Магазин
              </SortableHeader>

              <SortableHeader
                sortKey="purchaseDate"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="w-1/8"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Дата
              </SortableHeader>

              <SortableHeader
                sortKey="productName"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="w-2/6"
              >
                <Package className="w-4 h-4 mr-1" />
                Продукт
              </SortableHeader>

              <SortableHeader
                sortKey="quantity"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="w-1/8 text-center"
              >
                Количество
              </SortableHeader>

              <SortableHeader
                sortKey="totalPrice"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="w-1/8 text-right"
              >
                Сума
              </SortableHeader>

              <TableHead className="w-1/12 text-center">
                <Receipt className="w-4 h-4 mx-auto" />
              </TableHead>

              <TableHead className="w-1/12 text-center">
                Действия
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                showReceipt={showReceipt}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Показани {startIndex + 1}-{Math.min(startIndex + pageSize, filteredItems.length)} от {filteredItems.length} резултата
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Предишна
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Следваща
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredItems.length}
            </div>
            <div className="text-sm text-gray-600">Общо продукти</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatBulgarianCurrency(
                filteredItems.reduce((sum, item) => sum + item.totalPrice, 0)
              )}
            </div>
            <div className="text-sm text-gray-600">Общо сума</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatBulgarianCurrency(
                filteredItems.length > 0
                  ? filteredItems.reduce((sum, item) => sum + item.totalPrice, 0) / filteredItems.length
                  : 0
              )}
            </div>
            <div className="text-sm text-gray-600">Средна цена</div>
          </div>
        </div>
      </div>
    </div>
  );
}