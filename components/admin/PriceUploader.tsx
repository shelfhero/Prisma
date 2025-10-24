'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Upload, Download, Check, X, AlertCircle } from 'lucide-react';

interface UploadResult {
  success: boolean;
  rowsInserted: number;
  errors: any[];
}

export default function PriceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    // Parse and preview the file
    const text = await selectedFile.text();
    const rows = parseCSV(text);
    setPreview(rows.slice(0, 5)); // Show first 5 rows
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      data.push(row);
    }

    return data;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const supabase = createBrowserClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse CSV
      const text = await file.text();
      const rows = parseCSV(text);

      // Map CSV data to database format
      const pricesData = await Promise.all(rows.map(async (row) => {
        // Get standard product ID by name or position
        const { data: product } = await supabase
          .from('standard_products')
          .select('id')
          .or(`position.eq.${row.position},name.ilike.%${row.product_name}%`)
          .single();

        // Get retailer ID by name
        const { data: retailer } = await supabase
          .from('retailers')
          .select('id')
          .ilike('name', `%${row.retailer}%`)
          .single();

        if (!product || !retailer) {
          console.warn('Missing product or retailer:', row);
          return null;
        }

        return {
          standard_product_id: product.id,
          retailer_id: retailer.id,
          price: parseFloat(row.price),
          unit: row.unit || null,
          is_promotion: row.is_promotion === 'true' || row.is_promotion === '1',
          promotion_text: row.promotion_text || null,
          promotion_valid_until: row.promotion_valid_until || null
        };
      }));

      const validPrices = pricesData.filter(p => p !== null);

      // Call bulk insert function
      const { data, error } = await supabase.rpc('bulk_insert_manual_prices', {
        prices_data: validPrices,
        uploader_id: user.id
      });

      if (error) throw error;

      // Log upload history
      await supabase.from('price_upload_history').insert({
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        rows_processed: rows.length,
        rows_successful: data[0].rows_inserted,
        rows_failed: rows.length - data[0].rows_inserted,
        error_details: data[0].errors
      });

      setResult({
        success: true,
        rowsInserted: data[0].rows_inserted,
        errors: data[0].errors
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        rowsInserted: 0,
        errors: [{ error: error.message }]
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `position,product_name,retailer,price,unit,is_promotion,promotion_text,promotion_valid_until
1,Мляко прясно 3.6%,Kaufland,2.99,1л,false,,
1,Мляко прясно 3.6%,BILLA,3.15,1л,false,,
2,Хляб бял/пълнозърнест,Kaufland,1.49,500г,false,,
2,Хляб бял/пълнозърнест,Lidl,1.39,500г,true,Специална цена,2024-12-31
3,Яйца M,T-Market,4.99,10бр,false,,`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">📊 Качи седмични цени</h2>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">Как да качите цени:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Свалете шаблона за CSV файл</li>
          <li>Попълнете цените за всеки продукт и магазин</li>
          <li>Запазете като CSV (с кодировка UTF-8)</li>
          <li>Качете файла тук</li>
        </ol>
      </div>

      {/* Download Template */}
      <div className="mb-6">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Свали CSV шаблон
        </button>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">Избери CSV файл:</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Преглед (първи 5 реда):</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(preview[0]).map((header) => (
                    <th key={header} className="px-4 py-2 border-b text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="px-4 py-2 border-b">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5" />
          {uploading ? 'Качване...' : 'Качи цените'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.success ? (
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  Успешно качване!
                </h3>
                <p className="text-sm text-green-700">
                  Качени {result.rowsInserted} реда с цени.
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-orange-700">
                      {result.errors.length} реда с грешки:
                    </p>
                    <ul className="text-xs text-orange-600 mt-1 space-y-1">
                      {result.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>• {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  Грешка при качване
                </h3>
                <p className="text-sm text-red-700">
                  {result.errors[0]?.error || 'Неизвестна грешка'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Формат на CSV файла:
        </h3>
        <div className="text-sm space-y-1 font-mono text-gray-700">
          <p><strong>position</strong> - Номер на продукта (1-10)</p>
          <p><strong>product_name</strong> - Име на продукта</p>
          <p><strong>retailer</strong> - Име на магазина</p>
          <p><strong>price</strong> - Цена (напр. 2.99)</p>
          <p><strong>unit</strong> - Единица (напр. 1л, 500г)</p>
          <p><strong>is_promotion</strong> - true/false</p>
          <p><strong>promotion_text</strong> - Текст на промоцията (опционално)</p>
          <p><strong>promotion_valid_until</strong> - Дата (YYYY-MM-DD, опционално)</p>
        </div>
      </div>
    </div>
  );
}
