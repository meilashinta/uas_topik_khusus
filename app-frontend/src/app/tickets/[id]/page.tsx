'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import Link from 'next/link';
import { FiArrowLeft, FiClock, FiMessageSquare, FiPaperclip } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import dayjs from 'dayjs';
import styles from './TicketDetail.module.css';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: { name: string };
  createdAt: string;
  createdBy: { name: string; email: string };
  category: { name: string };
  assignments: Array<{ technician: { name: string } }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  histories: Record<string, any>[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // States for comments
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState('');

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/tickets/${params.id}`);
      console.log(res)
      setTicket(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch ticket detail', err);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && typeof window !== 'undefined') {
      router.push('/login');
      return;
    }

    if (_hasHydrated && isAuthenticated && params.id) {
      fetchTicket();
    }
  }, [isAuthenticated, router, params.id, refreshKey, fetchTicket, _hasHydrated]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/tickets/${ticket?.id}/comments`, { content: newComment, isInternal: false });
      setNewComment('');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssign = async () => {
    setIsAssignModalOpen(true);
    try {
      const res = await api.get('/users?role=TECHNICIAN');
      setTechnicians(res.data.data.data || res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) return;
    try {
      await api.post(`/tickets/${ticket?.id}/assign`, { technicianId: selectedTech });
      setIsAssignModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal assign teknisi');
    }
  };

  const handleResolve = async () => {
    if (!resolveNote.trim()) return;
    try {
      await api.patch(`/tickets/${ticket?.id}/status`, { status: 'RESOLVED', note: resolveNote });
      setIsResolveModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menyelesaikan tiket');
    }
  };

  const handleStartProgress = async () => {
    try {
      await api.patch(`/tickets/${ticket?.id}/status`, { status: 'IN_PROGRESS' });
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status tiket');
    }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/tickets/${ticket?.id}/close`, { rating: Number(rating), feedback });
      setIsCloseModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menutup tiket');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    try {
      await api.patch(`/tickets/${ticket?.id}/reopen`, { reason: reopenReason });
      setIsReopenModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal membuka ulang tiket');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': case 'CLOSED': return 'success';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
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

  // Normalize user role
  const userRole = user?.role ? (typeof user.role === 'object' ? (user.role as any).name : user.role) : '';

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
            <Badge variant={getPriorityVariant(ticket.priority.name)}>{ticket.priority.name}</Badge>
          </div>
        </div>
        <p className={styles.ticketMeta}>
          ID: #{ticket.id.substring(0, 8)} • Dibuat oleh {ticket.createdBy.name} pada {dayjs(ticket.createdAt).format('DD MMM YYYY, HH:mm')}
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
                    <strong>{c.user.name}</strong>
                    <p>{c.content}</p>
                    <span className={styles.time}>{dayjs(c.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>Belum ada komentar.</p>
              )}
            </div>

            <div className={styles.commentForm}>
              <textarea
                placeholder="Tulis komentar Anda..."
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <Button size="sm" onClick={handleAddComment} disabled={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Kirim Komentar'}
              </Button>
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
                <strong>{ticket.assignments.map(assignment => assignment.technician?.name).join(', ') || 'Belum ditugaskan'}</strong>
              </li>
              <li>
                <span>SLA Target</span>
                <strong className={styles.slaWarning}><FiClock /> 4 Jam Tersisa</strong>
              </li>
            </ul>

            {userRole === 'SUPERVISOR' && ticket.status === 'OPEN' && (
              <Button className={styles.actionBtn} onClick={handleOpenAssign}>Assign Teknisi</Button>
            )}

            {userRole === 'EMPLOYEE' && ticket.status === 'CLOSED' && (
              <Button className={styles.actionBtn} onClick={() => setIsReopenModalOpen(true)}>Buka Ulang Tiket</Button>
            )}

            {userRole === 'TECHNICIAN' && ticket.status === 'ASSIGNED' && (
              <Button variant="success" className={styles.actionBtn} onClick={handleStartProgress}>Mulai Kerjakan</Button>
            )}

            {userRole === 'TECHNICIAN' && ticket.status === 'IN_PROGRESS' && (
              <Button variant="success" className={styles.actionBtn} onClick={() => setIsResolveModalOpen(true)}>Tandai Selesai</Button>
            )}

            {userRole === 'EMPLOYEE' && ticket.status === 'RESOLVED' && (
              <>
                <Button variant="success" className={styles.actionBtn} onClick={() => setIsCloseModalOpen(true)}>Tutup & Beri Nilai</Button>
                <Button variant="danger" className={styles.actionBtn} style={{ marginTop: '0.5rem' }} onClick={() => setIsReopenModalOpen(true)}>Buka Ulang (Reopen)</Button>
              </>
            )}
          </div>

          <div className={`${styles.historyCard} glass-panel`}>
            <h3>Riwayat Perubahan</h3>
            <div className={styles.timeline}>
              {ticket.histories?.map(h => (
                <div key={h.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <p>Status berubah menjadi <strong>{h.toStatus || h.action}</strong> oleh <strong>{h.changedBy?.name}</strong></p>
                    {h.note && <p className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic', margin: '0.25rem 0' }}>"{h.note}"</p>}
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

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Teknisi">
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Pilih Teknisi</label>
          <select
            value={selectedTech}
            onChange={e => setSelectedTech(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="">-- Pilih Teknisi --</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.department?.name || 'Tidak ada departemen'})</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleAssign} disabled={!selectedTech}>Assign Teknisi</Button>
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Tandai Tiket Selesai">
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Catatan Penyelesaian</label>
          <textarea
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
            placeholder="Jelaskan tindakan yang telah dilakukan untuk menyelesaikan masalah ini..."
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', minHeight: '100px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleResolve} disabled={!resolveNote.trim()}>Selesai</Button>
          <Button variant="secondary" onClick={() => setIsResolveModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Tutup Tiket">
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Rating (1-5)</label>
          <select
            value={rating}
            onChange={e => setRating(Number(e.target.value))}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {[1, 2, 3, 4, 5].map(r => (
              <option key={r} value={r}>{r} Bintang</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Feedback/Ulasan</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            rows={4}
            placeholder="Beri ulasan mengenai layanan ini..."
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="success" onClick={handleClose}>Kirim Ulasan & Tutup Tiket</Button>
          <Button variant="secondary" onClick={() => setIsCloseModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      <Modal isOpen={isReopenModalOpen} onClose={() => setIsReopenModalOpen(false)} title="Buka Ulang Tiket">
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Alasan Membuka Ulang</label>
          <textarea
            value={reopenReason}
            onChange={e => setReopenReason(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            rows={4}
            placeholder="Mohon jelaskan alasan mengapa tiket ini perlu dibuka ulang..."
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="primary" onClick={handleReopen} disabled={!reopenReason.trim()}>Buka Ulang Tiket</Button>
          <Button variant="secondary" onClick={() => setIsReopenModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

    </div>
  );
}
