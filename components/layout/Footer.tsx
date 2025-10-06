'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Don't show footer on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">За Призма</h3>
            <p className="text-sm text-gray-600">
              Интелигентно управление на касови бележки и бюджет с AI технологии.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Правна информация</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Политика за поверителност
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Условия за ползване
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy Features */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🔒 Вашата поверителност</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Вашите данни са само ваши</li>
              <li>✅ Пълен контрол и достъп</li>
              <li>✅ Изтриване по всяко време</li>
              <li>✅ GDPR съвместимост</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Призма. Всички права запазени.
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>🇧🇬 Направено в България</span>
              <span>•</span>
              <span>Защитено с GDPR</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
