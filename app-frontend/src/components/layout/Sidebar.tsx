'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiList, FiPlusSquare, FiSettings, FiLogOut } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import styles from './Layout.module.css';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FiHome />, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'TECHNICIAN', 'EMPLOYEE'] },
    { name: 'Tickets', path: '/tickets', icon: <FiList />, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'TECHNICIAN', 'EMPLOYEE'] },
    { name: 'New Ticket', path: '/tickets/create', icon: <FiPlusSquare />, roles: ['EMPLOYEE'] },
    { name: 'Settings', path: '/settings', icon: <FiSettings />, roles: ['ADMINISTRATOR'] },
  ];

  const userRole = user?.role ? (typeof user.role === 'object' ? (user.role as any).name : user.role) : '';
  const filteredMenu = menuItems.filter(item => 
    user && item.roles.includes(userRole)
  );

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className="text-gradient">HelpDeskPro</h1>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h1 className="text-gradient">HelpDeskPro</h1>
      </div>
      
      <nav className={styles.sidebarNav}>
        <ul>
          {filteredMenu.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <li key={item.path}>
                <Link href={item.path} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.logoutBtn} onClick={logout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
