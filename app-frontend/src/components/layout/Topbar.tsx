'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { FiUser } from 'react-icons/fi';
import { NotificationDropdown } from './NotificationDropdown';
import styles from './Layout.module.css';

interface TopbarProps {
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title = 'Dashboard' }) => {
  const { user } = useAuthStore();

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <h2>{title}</h2>
      </div>
      <div className={styles.topbarRight}>
        <NotificationDropdown />
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <FiUser />
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.name || 'User'}</span>
            <span className={styles.userRole}>
              {user?.role ? (typeof user.role === 'object' ? (user.role as any).name : user.role) : ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
