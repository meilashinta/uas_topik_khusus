import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import styles from '@/components/layout/Layout.module.css';

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.mainLayout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Topbar title="Manajemen Tiket" />
        <main className={styles.pageContainer}>
          {children}
        </main>
      </div>
    </div>
  );
}
