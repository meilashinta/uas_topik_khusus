'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import mainStyles from '@/components/layout/Layout.module.css';
import styles from './SettingsNav.module.css';
import { useAuthStore } from '@/store/authStore';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const navItems = [
    { name: 'Overview', path: '/settings' },
    { name: 'Users', path: '/settings/users' },
    { name: 'Departments', path: '/settings/departments' },
    { name: 'Categories', path: '/settings/categories' },
    { name: 'Priorities & SLA', path: '/settings/priorities' },
  ];

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'ADMINISTRATOR') return null;

  return (
    <div className={mainStyles.mainLayout}>
      <Sidebar />
      <div className={mainStyles.mainContent}>
        <Topbar title="Pengaturan Sistem" />
        
        <div className={mainStyles.pageContainer}>
          <div className={styles.navContainer}>
            {navItems.map(item => {
              const isActive = pathname === item.path;
              return (
                <Link key={item.path} href={item.path} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className={styles.contentContainer}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
