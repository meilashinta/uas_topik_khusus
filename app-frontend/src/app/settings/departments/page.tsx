'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import styles from '../SettingsNav.module.css';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ name: '', code: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setIsEditing(true);
    setCurrentId(dept.id);
    setFormData({ name: dept.name, code: dept.code });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/departments/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      setDeleteConfirmId(null);
      setAlertMessage('Gagal menonaktifkan departemen');
    }
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;
    try {
      await api.patch(`/departments/${reactivateConfirmId}`, { isActive: true });
      setReactivateConfirmId(null);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      setReactivateConfirmId(null);
      setAlertMessage('Gagal mengaktifkan departemen');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/departments/${currentId}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      setIsModalOpen(false);
      setAlertMessage('Gagal menyimpan data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className={styles.headerRow}>
        <h3>Manajemen Departemen</h3>
        <Button onClick={handleOpenCreate}>+ Tambah Departemen</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Departemen</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id}>
                <td><strong>{dept.code}</strong></td>
                <td>{dept.name}</td>
                <td>
                  {dept.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="danger">Nonaktif</Badge>
                  )}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.actionBtn} onClick={() => handleOpenEdit(dept)}>Edit</button>
                    {dept.isActive ? (
                      <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setDeleteConfirmId(dept.id)}>Nonaktifkan</button>
                    ) : (
                      <button className={styles.actionBtn} style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => setReactivateConfirmId(dept.id)}>Aktifkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Departemen' : 'Tambah Departemen'}>
        <div className={styles.formGroup}>
          <label>Nama Departemen</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Information Technology"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Kode Departemen</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            placeholder="Contoh: IT"
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || !formData.code}>Simpan</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      {/* Delete / Deactivate Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Konfirmasi Penonaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin menonaktifkan departemen ini? Departemen yang nonaktif tidak dapat dipilih pada form pembuatan tiket.</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="danger" onClick={handleDelete}>Ya, Nonaktifkan</Button>
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
        </div>
      </Modal>

      {/* Reactivate Modal */}
      <Modal isOpen={!!reactivateConfirmId} onClose={() => setReactivateConfirmId(null)} title="Konfirmasi Pengaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin mengaktifkan kembali departemen ini?</p>
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
