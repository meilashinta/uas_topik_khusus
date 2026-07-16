'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import styles from '../SettingsNav.module.css';

interface Category {
  id: string;
  name: string;
  description: string;
  department?: { id: string; name: string };
  departmentId?: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', departmentId: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
  }, [fetchCategories, fetchDepartments]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ name: '', description: '', departmentId: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setIsEditing(true);
    setCurrentId(cat.id);
    setFormData({ name: cat.name, description: cat.description, departmentId: cat.departmentId || cat.department?.id || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/categories/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setDeleteConfirmId(null);
      setAlertMessage('Gagal menonaktifkan kategori');
    }
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;
    try {
      await api.patch(`/categories/${reactivateConfirmId}`, { isActive: true });
      setReactivateConfirmId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setReactivateConfirmId(null);
      setAlertMessage('Gagal mengaktifkan kategori');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload: any = { name: formData.name, description: formData.description };
      if (formData.departmentId) payload.departmentId = formData.departmentId;

      if (isEditing) {
        await api.patch(`/categories/${currentId}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setIsModalOpen(false);
      fetchCategories();
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
        <h3>Manajemen Kategori Tiket</h3>
        <Button onClick={handleOpenCreate}>+ Tambah Kategori</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Nama Kategori</th>
              <th>Deskripsi</th>
              <th>Departemen Terkait</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td><strong>{cat.name}</strong></td>
                <td>{cat.description}</td>
                <td>{cat.department?.name || '-'}</td>
                <td>
                  {cat.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="danger">Nonaktif</Badge>
                  )}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.actionBtn} onClick={() => handleOpenEdit(cat)}>Edit</button>
                    {cat.isActive ? (
                      <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setDeleteConfirmId(cat.id)}>Nonaktifkan</button>
                    ) : (
                      <button className={styles.actionBtn} style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => setReactivateConfirmId(cat.id)}>Aktifkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <div className={styles.formGroup}>
          <label>Nama Kategori</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Hardware Issue"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Deskripsi</label>
          <textarea
            className={styles.formInput}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Contoh: Masalah terkait perangkat keras..."
            rows={3}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Departemen Terkait (Opsional)</label>
          <select
            className={styles.formInput}
            value={formData.departmentId}
            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
          >
            <option value="">-- Pilih Departemen --</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || !formData.description}>Simpan</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      {/* Delete / Deactivate Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Konfirmasi Penonaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin menonaktifkan kategori ini? Kategori yang nonaktif tidak dapat dipilih pada form pembuatan tiket.</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="danger" onClick={handleDelete}>Ya, Nonaktifkan</Button>
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
        </div>
      </Modal>

      {/* Reactivate Modal */}
      <Modal isOpen={!!reactivateConfirmId} onClose={() => setReactivateConfirmId(null)} title="Konfirmasi Pengaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin mengaktifkan kembali kategori ini?</p>
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
