'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import styles from '../SettingsNav.module.css';

interface Priority {
  id: string;
  name: string;
  level: number;
  slaResponseMinutes: number;
  slaResolutionMinutes: number;
  isActive: boolean;
}

export default function PrioritiesPage() {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ name: 'LOW', slaResponseMinutes: 60, slaResolutionMinutes: 240 });
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const fetchPriorities = useCallback(async () => {
    try {
      const res = await api.get('/priorities');
      setPriorities(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ name: 'LOW', slaResponseMinutes: 60, slaResolutionMinutes: 240 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prio: Priority) => {
    setIsEditing(true);
    setCurrentId(prio.id);
    setFormData({ name: prio.name, slaResponseMinutes: prio.slaResponseMinutes, slaResolutionMinutes: prio.slaResolutionMinutes });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/priorities/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchPriorities();
    } catch (err) {
      console.error(err);
      setDeleteConfirmId(null);
      setAlertMessage('Gagal menonaktifkan prioritas');
    }
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;
    try {
      await api.patch(`/priorities/${reactivateConfirmId}`, { isActive: true });
      setReactivateConfirmId(null);
      fetchPriorities();
    } catch (err) {
      console.error(err);
      setReactivateConfirmId(null);
      setAlertMessage('Gagal mengaktifkan prioritas');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        slaResponseMinutes: Number(formData.slaResponseMinutes),
        slaResolutionMinutes: Number(formData.slaResolutionMinutes),
      };
      if (isEditing) {
        await api.patch(`/priorities/${currentId}`, payload);
      } else {
        await api.post('/priorities', payload);
      }
      setIsModalOpen(false);
      fetchPriorities();
    } catch (err) {
      console.error(err);
      setIsModalOpen(false);
      setAlertMessage('Gagal menyimpan data');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityVariant = (name: string) => {
    switch (name) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className={styles.headerRow}>
        <h3>Manajemen Prioritas & SLA</h3>
        <Button onClick={handleOpenCreate}>+ Tambah Prioritas</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Level Prioritas</th>
              <th>Target Respons (Menit)</th>
              <th>Target Penyelesaian (Menit)</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {priorities.map(prio => (
              <tr key={prio.id}>
                <td>
                  <Badge variant={getPriorityVariant(prio.name)}>{prio.name}</Badge>
                </td>
                <td>{prio.slaResponseMinutes} m</td>
                <td>{prio.slaResolutionMinutes} m</td>
                <td>
                  {prio.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="danger">Nonaktif</Badge>
                  )}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.actionBtn} onClick={() => handleOpenEdit(prio)}>Edit</button>
                    {prio.isActive ? (
                      <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setDeleteConfirmId(prio.id)}>Nonaktifkan</button>
                    ) : (
                      <button className={styles.actionBtn} style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => setReactivateConfirmId(prio.id)}>Aktifkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {priorities.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Prioritas' : 'Tambah Prioritas'}>
        <div className={styles.formGroup}>
          <label>Nama Prioritas</label>
          <select
            className={styles.formInput}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            disabled={isEditing}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>SLA Respons (Menit)</label>
          <input
            type="number"
            className={styles.formInput}
            value={formData.slaResponseMinutes}
            onChange={e => setFormData({ ...formData, slaResponseMinutes: Number(e.target.value) })}
            min="1"
          />
        </div>
        <div className={styles.formGroup}>
          <label>SLA Penyelesaian (Menit)</label>
          <input
            type="number"
            className={styles.formInput}
            value={formData.slaResolutionMinutes}
            onChange={e => setFormData({ ...formData, slaResolutionMinutes: Number(e.target.value) })}
            min="1"
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || !formData.slaResponseMinutes || !formData.slaResolutionMinutes}>Simpan</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      {/* Delete / Deactivate Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Konfirmasi Penonaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin menonaktifkan prioritas ini? Prioritas yang nonaktif tidak dapat dipilih pada form pembuatan tiket.</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="danger" onClick={handleDelete}>Ya, Nonaktifkan</Button>
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
        </div>
      </Modal>

      {/* Reactivate Modal */}
      <Modal isOpen={!!reactivateConfirmId} onClose={() => setReactivateConfirmId(null)} title="Konfirmasi Pengaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin mengaktifkan kembali prioritas ini?</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="success" onClick={handleReactivate}>Ya, Aktifkan</Button>
          <Button variant="secondary" onClick={() => setReactivateConfirmId(null)}>Batal</Button>
        </div>
      </Modal>

      {/* Alert / Error Modal */}
      <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Informasi">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>{alertMessage}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setAlertMessage(null)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
}
