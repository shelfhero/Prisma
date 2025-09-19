'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, X, Plus, Edit2, Save, Trash2 } from 'lucide-react';

interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

interface Receipt {
  id: string;
  storeName: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  imageUrl?: string;
}

export default function UploadReceiptPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Моля, изберете изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Файлът е твърде голям. Максималният размер е 10MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const processReceipt = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock receipt data
      const mockReceipt: Receipt = {
        id: Date.now().toString(),
        storeName: 'Фантастико',
        date: new Date().toLocaleDateString('bg-BG'),
        total: 45.67,
        items: [
          { id: '1', name: 'Хляб', price: 1.50, quantity: 2 },
          { id: '2', name: 'Мляко', price: 2.80, quantity: 1 },
          { id: '3', name: 'Яйца', price: 4.20, quantity: 1 },
          { id: '4', name: 'Сирене', price: 8.90, quantity: 1 },
          { id: '5', name: 'Домати', price: 3.45, quantity: 2 }
        ],
        imageUrl: previewUrl || undefined
      };

      setReceipt(mockReceipt);
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Грешка при обработка на касовата бележка');
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualItem = () => {
    if (!newItem.name || !newItem.price) return;

    const item: ReceiptItem = {
      id: Date.now().toString(),
      name: newItem.name,
      price: parseFloat(newItem.price),
      quantity: parseInt(newItem.quantity) || 1
    };

    if (receipt) {
      const updatedReceipt = {
        ...receipt,
        items: [...receipt.items, item],
        total: receipt.total + (item.price * item.quantity)
      };
      setReceipt(updatedReceipt);
    } else {
      setReceipt({
        id: Date.now().toString(),
        storeName: 'Ръчно въведено',
        date: new Date().toLocaleDateString('bg-BG'),
        total: item.price * item.quantity,
        items: [item]
      });
    }

    setNewItem({ name: '', price: '', quantity: '1' });
    setShowManualEntry(false);
  };

  const removeItem = (itemId: string) => {
    if (!receipt) return;

    const item = receipt.items.find(i => i.id === itemId);
    if (item) {
      const updatedReceipt = {
        ...receipt,
        items: receipt.items.filter(i => i.id !== itemId),
        total: receipt.total - (item.price * item.quantity)
      };
      setReceipt(updatedReceipt);
    }
  };

  const updateItem = (itemId: string, updates: Partial<ReceiptItem>) => {
    if (!receipt) return;

    const updatedItems = receipt.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        return updatedItem;
      }
      return item;
    });

    const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    setReceipt({
      ...receipt,
      items: updatedItems,
      total
    });
  };

  const saveReceipt = async () => {
    if (!receipt) return;

    try {
      // Here you would save to your database
      console.log('Saving receipt:', receipt);
      alert('Касовата бележка е запазена успешно!');

      // Reset the form
      setSelectedFile(null);
      setPreviewUrl(null);
      setReceipt(null);
      setIsEditing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Грешка при запазване на касовата бележка');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setReceipt(null);
    setIsEditing(false);
    setShowManualEntry(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Качване на касова бележка</h1>
            <p className="text-blue-100 mt-2">
              Качете снимка на касовата бележка или въведете данните ръчно
            </p>
          </div>

          <div className="p-6">
            {!receipt ? (
              <>
                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="max-w-md mx-auto rounded-lg shadow-md"
                      />
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={processReceipt}
                          disabled={isProcessing}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Обработка...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span>Обработи бележката</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={resetForm}
                          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Премахни</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          Пуснете снимката тук или кликнете за избор
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG до 10MB
                        </p>
                      </div>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Избери файл</span>
                        </button>
                        <button
                          onClick={() => setShowManualEntry(true)}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Ръчно въвеждане</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Manual Entry Form */}
                {showManualEntry && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Добави артикул</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input
                        type="text"
                        placeholder="Име на продукта"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Цена"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Количество"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={addManualItem}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-1"
                        >
                          Добави
                        </button>
                        <button
                          onClick={() => setShowManualEntry(false)}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Отказ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Receipt Display and Edit */
              <div className="space-y-6">
                {/* Receipt Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{receipt.storeName}</h2>
                    <p className="text-gray-600">Дата: {receipt.date}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>{isEditing ? 'Спри редакция' : 'Редактирай'}</span>
                    </button>
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Добави артикул</span>
                    </button>
                  </div>
                </div>

                {/* Receipt Items */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="grid grid-cols-12 gap-4 font-medium text-gray-700">
                      <div className="col-span-5">Продукт</div>
                      <div className="col-span-2">Цена</div>
                      <div className="col-span-2">Количество</div>
                      <div className="col-span-2">Общо</div>
                      {isEditing && <div className="col-span-1">Действия</div>}
                    </div>
                  </div>

                  <div className="divide-y">
                    {receipt.items.map((item) => (
                      <div key={item.id} className="px-4 py-3">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                className="w-full border rounded px-2 py-1"
                              />
                            ) : (
                              <span>{item.name}</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                className="w-full border rounded px-2 py-1"
                              />
                            ) : (
                              <span>{item.price.toFixed(2)} лв</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                className="w-full border rounded px-2 py-1"
                              />
                            ) : (
                              <span>{item.quantity}</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">
                              {(item.price * item.quantity).toFixed(2)} лв
                            </span>
                          </div>
                          {isEditing && (
                            <div className="col-span-1">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 px-4 py-3 border-t">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Общо:</span>
                      <span>{receipt.total.toFixed(2)} лв</span>
                    </div>
                  </div>
                </div>

                {/* Manual Entry Form for existing receipt */}
                {showManualEntry && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Добави артикул</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input
                        type="text"
                        placeholder="Име на продукта"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Цена"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Количество"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={addManualItem}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-1"
                        >
                          Добави
                        </button>
                        <button
                          onClick={() => setShowManualEntry(false)}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Отказ
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={resetForm}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <X className="h-5 w-5" />
                    <span>Започни отново</span>
                  </button>
                  <button
                    onClick={saveReceipt}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Запази касовата бележка</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}