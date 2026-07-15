'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FiPlus, FiFilter, FiSearch, FiEye } from 'react-icons/fi';
import dayjs from 'dayjs';
import styles from './Tickets.module.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: { name: string };
  author: { name: string };
  createdAt: string;
}

export default function TicketsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets');
      // The API returns { data: [...], meta: {...} } based on our backend implementation
      setTickets(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login');
      return;
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
  }, [isAuthenticated, router]);

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': 
      case 'CLOSED': return 'success';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch(priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'default';
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.ticketsContainer}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Daftar Tiket</h1>
          <p className={styles.subtitle}>Kelola dan pantau semua permintaan layanan IT.</p>
        </div>
        
        {user?.role === 'EMPLOYEE' && (
          <Link href="/tickets/create">
            <Button className={styles.createBtn}>
              <FiPlus /> Buat Tiket Baru
            </Button>
          </Link>
        )}
      </div>

      <div className={`${styles.tableCard} glass-panel`}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input type="text" placeholder="Cari tiket..." className={styles.searchInput} />
          </div>
          <Button variant="secondary" className={styles.filterBtn}>
            <FiFilter /> Filter
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Judul Tiket</th>
                <th>Kategori</th>
                <th>Pemohon</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>Memuat data...</td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>Belum ada tiket yang ditemukan.</td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className={styles.ticketId}>
                      #{ticket.id.substring(0, 8)}
                    </td>
                    <td className={styles.ticketTitle}>{ticket.title}</td>
                    <td>{ticket.category?.name || '-'}</td>
                    <td>{ticket.author?.name || '-'}</td>
                    <td>
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>{dayjs(ticket.createdAt).format('DD MMM YYYY, HH:mm')}</td>
                    <td>
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="ghost" size="sm" className={styles.actionBtn}>
                          <FiEye /> Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
