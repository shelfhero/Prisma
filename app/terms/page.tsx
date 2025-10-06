/**
 * Terms of Service Page
 * Legal terms in Bulgarian
 */

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, User, AlertCircle, Scale } from 'lucide-react';

export const metadata = {
  title: 'Условия за ползване - Призма',
  description: 'Правила и условия за използване на Призма',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Условия за ползване
          </h1>
          <p className="text-lg text-gray-600">
            Последна актуализация: 2 октомври 2025 г.
          </p>
        </div>

        {/* Quick Summary */}
        <Card className="p-6 mb-8 bg-purple-50 border-purple-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Накратко
          </h2>
          <div className="space-y-2 text-gray-700">
            <p>✅ Призма е <strong>безплатно</strong> приложение за лично ползване</p>
            <p>✅ <strong>Вие притежавате</strong> всички ваши данни</p>
            <p>✅ Използвайте приложението <strong>отговорно и законосъобразно</strong></p>
            <p>✅ Ние се стремим да осигурим <strong>надеждна услуга</strong>, но без гаранции</p>
            <p>✅ Можете да <strong>прекратите</strong> използването по всяко време</p>
          </div>
        </Card>

        <div className="space-y-8">
          {/* Section 1: Agreement */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Приемане на условията
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Добре дошли в Призма! С използването на нашето приложение, вие приемате да
                спазвате тези Условия за ползване ("Условията"). Моля, прочетете ги внимателно.
              </p>
              <p>
                Ако не приемате тези Условия, моля не използвайте Призма.
              </p>
              <p className="font-semibold">
                С регистрацията на профил в Призма, вие потвърждавате, че:
              </p>
              <ul>
                <li>Сте навършили 16 години</li>
                <li>Имате правото да приемете тези Условия</li>
                <li>Ще използвате услугата законосъобразно</li>
              </ul>
            </div>
          </Card>

          {/* Section 2: Service Description */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Описание на услугата
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Призма е приложение за управление на лични финанси, което предоставя:
              </p>
              <ul>
                <li>Сканиране и обработка на касови бележки с OCR технология</li>
                <li>Автоматично категоризиране на разходи</li>
                <li>Бюджетно планиране и проследяване</li>
                <li>Анализи и статистики на разходите</li>
                <li>Съхранение на касови бележки в облака</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                <p className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Важна информация:</p>
                <p className="text-sm text-blue-700">
                  Призма е инструмент за <strong>лично финансово планиране</strong>. Не предоставя
                  финансови съвети, данъчни консултации или счетоводни услуги. За професионални
                  съвети, моля консултирайте се със специалист.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 3: User Account */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="w-6 h-6 mr-2 text-purple-600" />
              3. Потребителски профил
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold mt-6 mb-3">3.1. Регистрация</h3>
              <p>За да използвате Призма, трябва да:</p>
              <ul>
                <li>Създадете профил с валиден имейл адрес</li>
                <li>Изберете сигурна парола</li>
                <li>Предоставите точна информация</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">3.2. Сигурност на профила</h3>
              <p>Вие сте отговорни за:</p>
              <ul>
                <li>Поддържане на поверителността на вашата парола</li>
                <li>Всички дейности, извършени с вашия профил</li>
                <li>Незабавно уведомяване при неоторизиран достъп</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">3.3. Един профил на потребител</h3>
              <p>
                Всеки потребител може да има само един активен профил. Множеството профили
                могат да бъдат изтрити без предупреждение.
              </p>
            </div>
          </Card>

          {/* Section 4: User Rights */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Вашите права
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="font-semibold">Като потребител на Призма, имате право да:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Притежавате вашите данни</h3>
              <p>
                Всички данни, които създавате в Призма (касови бележки, бюджети, анализи),
                са изцяло ваша собственост. Ние само ги съхраняваме и обработваме от ваше име.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Експортирате данните си</h3>
              <p>
                По всяко време можете да експортирате всички ваши данни в стандартен формат
                (JSON, CSV).
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Изтриете профила си</h3>
              <p>
                Можете да изтриете профила си и всички данни по всяко време от настройките.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">✅ Контролирате поверителността</h3>
              <p>
                Можете да управлявате настройките за поверителност и да решавате какви данни
                да споделяте.
              </p>
            </div>
          </Card>

          {/* Section 5: Acceptable Use */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-red-600" />
              5. Приемливо ползване
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>При използването на Призма, вие се задължавате ДА НЕ:</p>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 my-6">
                <ul className="text-sm text-red-700 space-y-2 mb-0">
                  <li>❌ Нарушавате закони или права на други</li>
                  <li>❌ Качвате злонамерен код или вируси</li>
                  <li>❌ Се опитвате да получите неоторизиран достъп</li>
                  <li>❌ Правите reverse engineering на приложението</li>
                  <li>❌ Използвате автоматизирани системи (ботове) без разрешение</li>
                  <li>❌ Натоварвате прекомерно системата</li>
                  <li>❌ Качвате незаконно или неприлично съдържание</li>
                  <li>❌ Нарушавате интелектуална собственост</li>
                  <li>❌ Препродавате или превъзлагате услугата</li>
                </ul>
              </div>

              <p className="font-semibold mt-6">Последствия от нарушения:</p>
              <p>
                Нарушаването на тези правила може да доведе до преустановяване или прекратяване
                на вашия профил без предупреждение.
              </p>
            </div>
          </Card>

          {/* Section 6: Intellectual Property */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Интелектуална собственост
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold mt-6 mb-3">6.1. Наша собственост</h3>
              <p>
                Призма, включително всички кодове, дизайни, лога, търговски марки и съдържание,
                е собственост на създателите на Призма и е защитена от закони за авторско право.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">6.2. Ваша собственост</h3>
              <p>
                Вие запазвате всички права върху съдържанието, което качвате (касови бележки,
                снимки, данни). С качването на съдържание, вие ни предоставяте ограничен лиценз
                да го обработваме за целите на услугата.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">6.3. Използване на AI модели</h3>
              <p>
                AI моделите, използвани за обработка (OCR, категоризация), са собственост на
                съответните доставчици (Google, OpenAI). Използването им е съгласно техните
                условия за ползване.
              </p>
            </div>
          </Card>

          {/* Section 7: Service Availability */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Наличност на услугата
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Ние се стремим да осигурим надеждна и непрекъсната услуга, но:
              </p>
              <ul>
                <li>Не гарантираме 100% наличност (uptime)</li>
                <li>Може да има планирани или непланирани прекъсвания</li>
                <li>Може да променяме или спираме функции</li>
                <li>Може да прекратим услугата с 30-дневно предизвестие</li>
              </ul>

              <p className="font-semibold mt-6">Поддръжка:</p>
              <p>
                Ще уведомяваме потребителите за планирани прекъсвания поне 24 часа предварително.
              </p>
            </div>
          </Card>

          {/* Section 8: Disclaimers */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Scale className="w-6 h-6 mr-2 text-gray-600" />
              8. Ограничения и отказ от отговорност
            </h2>
            <div className="prose prose-gray max-w-none">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
                <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Важно:</p>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p>
                    Призма се предоставя "КАКТО Е" ("AS IS") без гаранции от какъвто и да е вид,
                    изрични или подразбиращи се.
                  </p>
                  <p>Не гарантираме, че:</p>
                  <ul>
                    <li>Услугата ще бъде безгрешна или непрекъсната</li>
                    <li>OCR разпознаването ще бъде 100% точно</li>
                    <li>Автоматичната категоризация ще бъде винаги правилна</li>
                    <li>Данните няма да бъдат загубени (препоръчваме редовни експорти)</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.1. Не сме финансови съветници</h3>
              <p>
                Призма не предоставя финансови, инвестиционни, данъчни или правни съвети.
                Статистиките и анализите са само за информация. Винаги консултирайте се със
                специалист за важни финансови решения.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.2. Ограничение на отговорността</h3>
              <p>
                В максимална степен, позволена от закона, ние не носим отговорност за:
              </p>
              <ul>
                <li>Косвени, случайни или последващи щети</li>
                <li>Загуба на печалби, данни или бизнес възможности</li>
                <li>Грешки в OCR разпознаването или категоризацията</li>
                <li>Действия на трети страни (AI доставчици, хостинг)</li>
              </ul>
            </div>
          </Card>

          {/* Section 9: Changes to Terms */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. Промени в условията
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Може да актуализираме тези Условия периодично. При съществени промени:
              </p>
              <ul>
                <li>Ще ви уведомим по имейл поне 7 дни предварително</li>
                <li>Ще покажем известие в приложението</li>
                <li>Ще актуализираме датата "Последна актуализация"</li>
              </ul>

              <p>
                Продължаването на използването на Призма след промените означава приемане
                на новите Условия.
              </p>
            </div>
          </Card>

          {/* Section 10: Termination */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. Прекратяване
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold mt-6 mb-3">10.1. От ваша страна</h3>
              <p>
                Можете да прекратите използването на Призма по всяко време, като:
              </p>
              <ul>
                <li>Спрете да използвате приложението</li>
                <li>Изтриете профила си от Настройки</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">10.2. От наша страна</h3>
              <p>
                Можем да прекратим или суспендираме вашия профил ако:
              </p>
              <ul>
                <li>Нарушавате тези Условия</li>
                <li>Използвате услугата незаконосъобразно</li>
                <li>Профилът е неактивен повече от 2 години</li>
              </ul>

              <p>
                При прекратяване, вашите данни ще бъдат изтрити в рамките на 30 дни,
                освен ако законът не изисква по-дълго съхранение.
              </p>
            </div>
          </Card>

          {/* Section 11: Governing Law */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              11. Приложимо право
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Тези Условия се уреждат от законите на Република България.
              </p>
              <p>
                Всички спорове ще се решават от компетентните български съдилища.
              </p>
            </div>
          </Card>

          {/* Section 12: Contact */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              12. Контакт
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>За въпроси относно тези Условия:</p>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 my-6">
                <p><strong>Email:</strong> legal@prizma.bg</p>
                <p><strong>Поддръжка:</strong> support@prizma.bg</p>
                <p><strong>Адрес:</strong> [Адрес на компанията]</p>
                <p><strong>Телефон:</strong> +359 888 123 456</p>
              </div>
            </div>
          </Card>

          {/* Section 13: Severability */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              13. Разделимост
            </h2>
            <div className="prose prose-gray max-w-none">
              <p>
                Ако някоя разпоредба от тези Условия бъде призната за невалидна или неприложима,
                останалите разпоредби остават в сила.
              </p>
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
              href="/privacy"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Политика за поверителност
            </Link>
            <Link
              href="/settings"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Настройки
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            © 2025 Призма. Всички права запазени.
          </p>
        </div>
      </div>
    </div>
  );
}
