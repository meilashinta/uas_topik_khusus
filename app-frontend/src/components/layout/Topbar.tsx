import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { FiBell, FiUser } from 'react-icons/fi';
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
        <button className={styles.iconBtn}>
          <FiBell />
          <span className={styles.notificationBadge}>3</span>
        </button>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <FiUser />
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.name || 'Loading...'}</span>
            <span className={styles.userRole}>{user?.role || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
