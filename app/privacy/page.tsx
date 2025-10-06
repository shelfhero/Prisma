/**
 * Privacy Policy Page
 * GDPR-compliant privacy policy in Bulgarian
 */

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Shield, Lock, Eye, Trash2, Download, Server } from 'lucide-react';

export const metadata = {
  title: 'Политика за поверителност - Призма',
  description: 'Как Призма защитава вашите лични данни и спазва GDPR',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Политика за поверителност
          </h1>
          <p className="text-lg text-gray-600">
            Последна актуализация: 2 октомври 2025 г.
          </p>
        </div>

        {/* Quick Summary */}
        <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-blue-600" />
            Накратко
          </h2>
          <div className="space-y-2 text-gray-700">
            <p>✅ Вашите данни са <strong>само ваши</strong> - никой друг не може да ги види</p>
            <p>✅ Използваме данните <strong>само за вашия личен бюджет</strong></p>
            <p>✅ Можете да <strong>изтриете всички данни</strong> по всяко време</p>
            <p>✅ Спазваме <strong>GDPR и българското законодателство</strong></p>
            <p>✅ Не продаваме и не споделяме вашите данни с трети страни</p>
          </div>
        </Card>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Section 1: Introduction */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Въведение
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Призма ("ние", "нашият", "приложението") е приложение за управление на лични
                финанси, разработено за български потребители. Защитата на вашата
                поверителност е наш основен приоритет.
              </p>
              <p>
                Тази Политика за поверителност обяснява как събираме, използваме, съхраняваме
                и защитаваме вашите лични данни в съответствие с:
              </p>
              <ul>
                <li>Общ регламент за защита на данните (GDPR)</li>
                <li>Закон за защита на личните данни (ЗЗЛД) на Република България</li>
                <li>Други приложими български и европейски закони</li>
              </ul>
            </div>
          </Card>

          {/* Section 2: Data We Collect */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Server className="w-6 h-6 mr-2 text-blue-600" />
              2. Какви данни събираме
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold mt-6 mb-3">2.1. Данни за профила</h3>
              <ul>
                <li><strong>Имейл адрес</strong> - за регистрация и вход в системата</li>
                <li><strong>Име</strong> - по ваш избор, за персонализация</li>
                <li><strong>Парола</strong> - хеширана и криптирана, никога не се съхранява в чист текст</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">2.2. Финансови данни</h3>
              <ul>
                <li><strong>Касови бележки</strong> - снимки и данни от касови бележки (магазин, сума, продукти)</li>
                <li><strong>Бюджети</strong> - вашите месечни бюджети и категории</li>
                <li><strong>Разходи</strong> - анализи на вашите разходи по категории</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">2.3. Технически данни</h3>
              <ul>
                <li><strong>IP адрес</strong> - за сигурност и предотвратяване на злоупотреби</li>
                <li><strong>Браузър и устройство</strong> - за оптимизация на изживяването</li>
                <li><strong>Дата и час на достъп</strong> - за сигурност и отстраняване на проблеми</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
                <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Важно:</p>
                <p className="text-sm text-yellow-700">
                  НЕ събираме и НЕ съхраняваме банкови данни, номера на кредитни карти,
                  или друга чувствителна финансова информация.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 3: How We Use Data */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Как използваме вашите данни
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>Използваме вашите данни <strong>изключително</strong> за:</p>
              <ul>
                <li><strong>Управление на профила</strong> - вход в системата, персонализация</li>
                <li><strong>Обработка на касови бележки</strong> - OCR разпознаване, категоризация</li>
                <li><strong>Бюджетно планиране</strong> - проследяване на разходи, анализи, препоръки</li>
                <li><strong>Подобряване на услугата</strong> - оптимизация на разпознаването, фиксиране на грешки</li>
                <li><strong>Сигурност</strong> - защита от неоторизиран достъп и злоупотреби</li>
              </ul>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 my-6">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ Вашите данни са само ваши</p>
                <p className="text-sm text-green-700">
                  Никога няма да продаваме, споделяме или предоставяме вашите данни на трети страни
                  за маркетингови цели или друго. Вашите касови бележки и финансова информация са
                  строго поверителни.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 4: AI Processing */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Обработка с изкуствен интелект (AI)
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Призма използва AI технологии за автоматично разпознаване на текст от касови бележки:
              </p>
              <ul>
                <li><strong>Google Cloud Vision API</strong> - за OCR (оптично разпознаване на символи)</li>
                <li><strong>OpenAI GPT-4</strong> - за интелигентна категоризация на продукти</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Какво се случва с вашите снимки:</h3>
              <ol>
                <li>Снимката на касовата бележка се изпраща криптирано до AI услугата</li>
                <li>AI извлича текста и структурираните данни (магазин, продукти, цени)</li>
                <li>Обработените данни се връщат в Призма</li>
                <li>Оригиналната снимка се съхранява в защитено облачно хранилище (Supabase)</li>
              </ol>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                <p className="text-sm font-semibold text-blue-800 mb-2">🔒 Защита на данните</p>
                <p className="text-sm text-blue-700">
                  AI доставчиците (Google, OpenAI) обработват данните временно и не ги съхраняват
                  постоянно. Всички комуникации са криптирани с TLS/SSL.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 5: Data Storage */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              5. Къде се съхраняват вашите данни
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Вашите данни се съхраняват в:
              </p>
              <ul>
                <li><strong>Supabase (AWS EU)</strong> - база данни и файлове, сървъри в Европейския съюз</li>
                <li><strong>Криптиране в покой</strong> - всички данни са криптирани на диска</li>
                <li><strong>Криптиране в движение</strong> - всички връзки използват HTTPS/TLS</li>
                <li><strong>Бекъпи</strong> - автоматични резервни копия с криптиране</li>
              </ul>

              <p className="font-semibold mt-4">
                Всички сървъри са разположени в Европейския съюз и спазват GDPR изискванията.
              </p>
            </div>
          </Card>

          {/* Section 6: Your Rights (GDPR) */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Вашите права (GDPR)
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>Според GDPR и ЗЗЛД, имате следните права:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на достъп</h3>
              <p>Можете да поискате копие на всички ваши данни.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на поправка</h3>
              <p>Можете да коригирате неточни или непълни данни.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на изтриване ("право да бъдеш забравен")</h3>
              <p>Можете да поискате изтриване на всички ваши данни по всяко време.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на преносимост</h3>
              <p>Можете да експортирате вашите данни в структуриран, машинночетим формат (JSON, CSV).</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на възражение</h3>
              <p>Можете да възразите срещу определени видове обработка на данни.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Право на ограничаване</h3>
              <p>Можете да ограничите обработката на вашите данни в определени случаи.</p>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                <p className="text-sm font-semibold text-blue-800 mb-2">📧 Как да упражните правата си:</p>
                <p className="text-sm text-blue-700">
                  За да упражните някое от тези права, свържете се с нас на:
                  <br />
                  <strong>Email:</strong> privacy@prizma.bg
                  <br />
                  <strong>Или:</strong> Използвайте настройките в профила си → "Изтрий профила ми"
                </p>
              </div>
            </div>
          </Card>

          {/* Section 7: Data Deletion */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Trash2 className="w-6 h-6 mr-2 text-red-600" />
              7. Изтриване на данни
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold mt-6 mb-3">Как да изтриете профила си:</h3>
              <ol>
                <li>Влезте в профила си</li>
                <li>Отидете в <strong>Настройки</strong></li>
                <li>Превъртете до секция <strong>"Изтриване на профил"</strong></li>
                <li><em>Опционално:</em> Експортирайте вашите данни преди изтриване</li>
                <li>Кликнете <strong>"Изтрий профила ми"</strong></li>
                <li>Потвърдете изтриването</li>
              </ol>

              <h3 className="text-xl font-semibold mt-6 mb-3">Какво се изтрива:</h3>
              <ul>
                <li>✅ Профил и данни за вход</li>
                <li>✅ Всички касови бележки и снимки</li>
                <li>✅ Бюджети и категории</li>
                <li>✅ Анализи и статистики</li>
                <li>✅ Всички свързани данни</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 my-6">
                <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Внимание:</p>
                <p className="text-sm text-red-700">
                  Изтриването е <strong>необратимо</strong>. След потвърждение, всички ваши данни
                  ще бъдат permanent изтрити в рамките на 30 дни. Моля, експортирайте данните си
                  преди изтриване, ако искате да ги запазите.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 8: Data Export */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Download className="w-6 h-6 mr-2 text-green-600" />
              8. Експорт на данни
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Можете да експортирате всички ваши данни във формат JSON или CSV по всяко време:
              </p>
              <ol>
                <li>Отидете в <strong>Настройки</strong></li>
                <li>Намерете секцията <strong>"Експорт на данни"</strong></li>
                <li>Изберете формат (JSON или CSV)</li>
                <li>Кликнете <strong>"Експортирай данните ми"</strong></li>
                <li>Свалете файла</li>
              </ol>

              <p>Експортираните данни включват:</p>
              <ul>
                <li>Профилна информация</li>
                <li>Всички касови бележки с продукти и цени</li>
                <li>Бюджети и категории</li>
                <li>Статистики и анализи</li>
              </ul>
            </div>
          </Card>

          {/* Section 9: Security */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. Сигурност
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>Предприемаме следните мерки за защита на вашите данни:</p>
              <ul>
                <li><strong>Криптиране</strong> - TLS/SSL за всички връзки, AES-256 за данни в покой</li>
                <li><strong>Хеширане на пароли</strong> - bcrypt с висока цена</li>
                <li><strong>Row-Level Security (RLS)</strong> - потребителите виждат само своите данни</li>
                <li><strong>Защита от атаки</strong> - rate limiting, CSRF tokens, XSS protection</li>
                <li><strong>Валидация на входни данни</strong> - предотвратяване на SQL injection</li>
                <li><strong>Редовни бекъпи</strong> - автоматични резервни копия</li>
                <li><strong>Мониторинг</strong> - 24/7 наблюдение за сигурност</li>
              </ul>
            </div>
          </Card>

          {/* Section 10: Cookies */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. Бисквитки (Cookies)
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>Призма използва минимален брой бисквитки:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Задължителни бисквитки:</h3>
              <ul>
                <li><strong>Сесийна бисквитка</strong> - за да останете влезли</li>
                <li><strong>CSRF token</strong> - за сигурност</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Опционални бисквитки:</h3>
              <ul>
                <li><strong>Предпочитания</strong> - запазване на настройки (само с ваше съгласие)</li>
              </ul>

              <p>
                НЕ използваме бисквитки за следене, реклами или аналитика без ваше изрично съгласие.
              </p>
            </div>
          </Card>

          {/* Section 11: Children */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              11. Деца
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Призма не е предназначена за деца под 16 години. Ако сте родител или настойник
                и смятате, че детето ви е предоставило лични данни без ваше разрешение, моля
                свържете се с нас на privacy@prizma.bg.
              </p>
            </div>
          </Card>

          {/* Section 12: Changes */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              12. Промени в политиката
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Можем да актуализираме тази Политика за поверителност периодично. При съществени
                промени ще ви уведомим чрез:
              </p>
              <ul>
                <li>Имейл на регистрирания ви адрес</li>
                <li>Уведомление в приложението</li>
                <li>Актуализация на датата "Последна актуализация" в началото на тази страница</li>
              </ul>
            </div>
          </Card>

          {/* Section 13: Contact */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              13. Контакт
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>За въпроси относно тази Политика за поверителност или вашите данни:</p>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 my-6">
                <p className="font-semibold text-gray-900 mb-4">Контактна информация:</p>
                <p><strong>Email:</strong> privacy@prizma.bg</p>
                <p><strong>Поддръжка:</strong> support@prizma.bg</p>
                <p><strong>Адрес:</strong> [Адрес на компанията]</p>
                <p><strong>Телефон:</strong> +359 888 123 456</p>
              </div>

              <p>
                Имате право да подадете жалба до Комисията за защита на личните данни (КЗЛД)
                на Република България:
              </p>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 my-6">
                <p className="font-semibold text-gray-900 mb-4">КЗЛД:</p>
                <p><strong>Адрес:</strong> гр. София 1592, бул. "Проф. Цветан Лазаров" № 2</p>
                <p><strong>Email:</strong> kzld@cpdp.bg</p>
                <p><strong>Телефон:</strong> +359 2 915 3 518</p>
                <p><strong>Уебсайт:</strong> www.cpdp.bg</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Прочетете също:
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/terms"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Условия за ползване
            </Link>
            <Link
              href="/settings"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Настройки на поверителност
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
