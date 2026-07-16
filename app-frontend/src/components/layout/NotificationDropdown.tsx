'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import api from '@/lib/api';
import styles from './Layout.module.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=10');
      // Extract array based on standard API wrapper
      const items = res.data?.data?.data || res.data?.data || [];
      if (Array.isArray(items)) {
        setNotifications(items);
        setUnreadCount(items.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds} dtk lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mnt lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hr lalu`;
  };

  return (
    <div className={styles.notificationWrapper} ref={dropdownRef}>
      <button className={styles.iconBtn} onClick={() => setIsOpen(!isOpen)}>
        <FiBell />
        {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={`${styles.notificationDropdown} glass-panel`}>
          <div className={styles.notificationHeader}>
            <h4>Notifikasi</h4>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllAsRead}>
                <FiCheckCircle /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyNotification}>Belum ada notifikasi</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`${styles.notificationItem} ${!notif.isRead ? styles.unread : ''}`}
                >
                  <div className={styles.notificationContent}>
                    <strong>{notif.title}</strong>
                    <p>{notif.message}</p>
                    <span className={styles.timeAgo}>{timeAgo(notif.createdAt)}</span>
                  </div>
                  {!notif.isRead && (
                    <button
                      className={styles.readBtn}
                      onClick={(e) => markAsRead(notif.id, e)}
                      title="Tandai sudah dibaca"
                    >
                      <FiCheck />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
