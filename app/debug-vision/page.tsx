'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function DebugVisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function testVisionAPI() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/debug/test-vision', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function checkEnvironment() {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/test-vision');
      const data = await response.json();
      setResult({ environment_check: data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Environment check failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Google Vision API Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Check */}
          <div>
            <Button onClick={checkEnvironment} disabled={loading} variant="outline">
              Check Environment Configuration
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              onClick={testVisionAPI}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Google Vision OCR'}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4">
              {result.environment_check && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Environment Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Google Vision Configured:</strong>
                        <Badge className={result.environment_check.environment.google_vision_configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {result.environment_check.environment.google_vision_configured ? 'YES' : 'NO'}
                        </Badge>
                      </div>
                      <div>
                        <strong>Project ID:</strong> {result.environment_check.environment.project_id}
                      </div>
                      <div>
                        <strong>API Key:</strong> {result.environment_check.environment.api_key}
                      </div>
                      <div>
                        <strong>Credentials:</strong> {result.environment_check.environment.credentials}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">OCR Test Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Success:</strong>
                        <Badge className={result.result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {result.result.success ? 'YES' : 'NO'}
                        </Badge>
                      </div>
                      <div>
                        <strong>Confidence:</strong> {result.result.confidence}%
                      </div>
                      <div>
                        <strong>Retailer:</strong> {result.result.retailer || 'Not detected'}
                      </div>
                      <div>
                        <strong>Total:</strong> {result.result.total || 'Not detected'} лв
                      </div>
                      <div>
                        <strong>Items:</strong> {result.result.items_count}
                      </div>
                      <div>
                        <strong>Enhanced Extraction:</strong> {result.result.extraction_available ? 'Available' : 'Not available'}
                      </div>
                    </div>

                    {result.result.quality_report && (
                      <div>
                        <strong>Quality Report:</strong>
                        <ul className="text-sm text-gray-600 mt-1">
                          <li>Issues: {result.result.quality_report.issues}</li>
                          <li>Processing Time: {result.result.quality_report.processingTime}ms</li>
                          <li>Suggestions: {result.result.quality_report.suggestions.length}</li>
                        </ul>
                      </div>
                    )}

                    {result.result.raw_text_preview && (
                      <div>
                        <strong>Raw OCR Text Preview:</strong>
                        <Textarea
                          value={result.result.raw_text_preview}
                          readOnly
                          className="mt-2 font-mono text-xs"
                          rows={6}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Full JSON Result */}
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Show Full JSON Result</summary>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="mt-2 font-mono text-xs"
                  rows={20}
                />
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}