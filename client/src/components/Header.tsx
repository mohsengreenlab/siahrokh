import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { key: 'home', href: '/' },
    { key: 'tournaments', href: '/#tournaments' },
    { key: 'certificate', href: '/certificate' },
    { key: 'faq', href: '/faq' },
    { key: 'terms', href: '/terms' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-chess-black/95 backdrop-blur-sm border-b border-chess-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <i className="fas fa-chess-king text-white text-2xl mx-3"></i>
              <div>
                <h1 className="text-xl font-bold text-white">سیاه‌رخ</h1>
                <p className="text-xs text-gray-400">SiahRokh</p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="flex items-baseline space-x-4 space-x-reverse">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location === item.href
                      ? 'text-white font-semibold border-b-2 border-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
            </div>
          </nav>
          
          {/* Language Switcher */}
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-chess-dark border-t border-chess-card">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`block px-3 py-2 text-base font-medium transition-colors ${
                  location === item.href
                    ? 'text-white font-semibold bg-gray-800'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
