'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import Link from 'next/link';
import { FiArrowLeft, FiClock, FiMessageSquare, FiPaperclip } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import dayjs from 'dayjs';
import styles from './TicketDetail.module.css';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  author: { name: string; email: string };
  category: { name: string };
  assignedTo?: { name: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  histories: Record<string, any>[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login');
      return;
    }

    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/${params.id}`);
        setTicket(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to fetch ticket detail', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (params.id) {
      fetchTicket();
    }
  }, [isAuthenticated, router, params.id]);

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': case 'CLOSED': return 'success';
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

  if (isLoading) {
    return <div className={styles.loadingState}>Memuat detail tiket...</div>;
  }

  if (!ticket) {
    return <div className={styles.errorState}>Tiket tidak ditemukan.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/tickets" className={styles.backLink}>
          <FiArrowLeft /> Kembali ke Daftar Tiket
        </Link>
        <div className={styles.titleRow}>
          <h1 className="text-gradient">{ticket.title}</h1>
          <div className={styles.badges}>
            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
            <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge>
          </div>
        </div>
        <p className={styles.ticketMeta}>
          ID: #{ticket.id.substring(0, 8)} • Dibuat oleh {ticket.author.name} pada {dayjs(ticket.createdAt).format('DD MMM YYYY, HH:mm')}
        </p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainContent}>
          <div className={`${styles.detailCard} glass-panel`}>
            <h3>Deskripsi Masalah</h3>
            <div className={styles.description}>
              {ticket.description}
            </div>

            <div className={styles.attachments}>
              <h4><FiPaperclip /> Lampiran</h4>
              <p className={styles.emptyText}>Tidak ada lampiran.</p>
            </div>
          </div>

          <div className={`${styles.detailCard} glass-panel`}>
            <h3><FiMessageSquare /> Komentar</h3>
            <div className={styles.commentsList}>
              {ticket.comments?.length > 0 ? (
                ticket.comments.map(c => (
                  <div key={c.id} className={styles.commentItem}>
                    <strong>{c.author.name}</strong>
                    <p>{c.content}</p>
                    <span className={styles.time}>{dayjs(c.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>Belum ada komentar.</p>
              )}
            </div>
            
            <div className={styles.commentForm}>
              <textarea placeholder="Tulis komentar Anda..." rows={3}></textarea>
              <Button size="sm">Kirim Komentar</Button>
            </div>
          </div>
        </div>

        <div className={styles.sideContent}>
          <div className={`${styles.infoCard} glass-panel`}>
            <h3>Informasi Tiket</h3>
            <ul className={styles.infoList}>
              <li>
                <span>Kategori</span>
                <strong>{ticket.category?.name || '-'}</strong>
              </li>
              <li>
                <span>Ditugaskan Kepada</span>
                <strong>{ticket.assignedTo?.name || 'Belum ditugaskan'}</strong>
              </li>
              <li>
                <span>SLA Target</span>
                <strong className={styles.slaWarning}><FiClock /> 4 Jam Tersisa</strong>
              </li>
            </ul>

            {user?.role === 'SUPERVISOR' && ticket.status === 'OPEN' && (
              <Button className={styles.actionBtn}>Assign Teknisi</Button>
            )}
            
            {user?.role === 'TECHNICIAN' && ticket.status === 'IN_PROGRESS' && (
              <Button variant="success" className={styles.actionBtn}>Tandai Selesai</Button>
            )}
          </div>

          <div className={`${styles.historyCard} glass-panel`}>
            <h3>Riwayat Perubahan</h3>
            <div className={styles.timeline}>
              {ticket.histories?.map(h => (
                <div key={h.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <p>{h.action} oleh <strong>{h.actor.name}</strong></p>
                    <span>{dayjs(h.createdAt).format('DD/MM HH:mm')}</span>
                  </div>
                </div>
              ))}
              {(!ticket.histories || ticket.histories.length === 0) && (
                <p className={styles.emptyText}>Tidak ada riwayat.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
