'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import styles from '../SettingsNav.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  department: { id: string; name: string };
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleId: '', departmentId: '', isActive: true });
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data?.data || res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDependencies = useCallback(async () => {
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/departments')
      ]);
      setRoles(rolesRes.data.data || []);
      setDepartments(deptsRes.data.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDependencies();
  }, [fetchUsers, fetchDependencies]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ name: '', email: '', password: '', roleId: '', departmentId: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setIsEditing(true);
    setCurrentId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // password intentionally left blank on edit
      roleId: user.role?.id || '',
      departmentId: user.department?.id || '',
      isActive: user.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/users/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setDeleteConfirmId(null);
      setAlertMessage('Gagal menonaktifkan pengguna');
    }
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;
    try {
      await api.patch(`/users/${reactivateConfirmId}`, { isActive: true });
      setReactivateConfirmId(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setReactivateConfirmId(null);
      setAlertMessage('Gagal mengaktifkan pengguna');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (isEditing) {
        const payload = {
          name: formData.name,
          roleId: formData.roleId,
          departmentId: formData.departmentId,
          isActive: formData.isActive
        };
        await api.patch(`/users/${currentId}`, payload);
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
          departmentId: formData.departmentId
        };
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setIsModalOpen(false);
      setAlertMessage(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className={styles.headerRow}>
        <h3>Manajemen Pengguna</h3>
        <Button onClick={handleOpenCreate}>+ Tambah Pengguna</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Departemen</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td><Badge variant="info">{user.role?.name}</Badge></td>
                <td>{user.department?.name}</td>
                <td>
                  {user.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="danger">Nonaktif</Badge>
                  )}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.actionBtn} onClick={() => handleOpenEdit(user)}>Edit</button>
                    {user.isActive ? (
                      <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setDeleteConfirmId(user.id)}>Nonaktifkan</button>
                    ) : (
                      <button className={styles.actionBtn} style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => setReactivateConfirmId(user.id)}>Aktifkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Pengguna' : 'Tambah Pengguna'}>
        <div className={styles.formGroup}>
          <label>Nama Lengkap</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        {!isEditing && (
          <>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                className={styles.formInput}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </>
        )}

        <div className={styles.formGroup}>
          <label>Role</label>
          <select
            className={styles.formInput}
            value={formData.roleId}
            onChange={e => setFormData({ ...formData, roleId: e.target.value })}
          >
            <option value="">-- Pilih Role --</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Departemen</label>
          <select
            className={styles.formInput}
            value={formData.departmentId}
            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
          >
            <option value="">-- Pilih Departemen --</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {isEditing && (
          <div className={styles.formGroup}>
            <label>Status Akun</label>
            <select
              className={styles.formInput}
              value={formData.isActive ? 'true' : 'false'}
              onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || !formData.email || !formData.roleId || !formData.departmentId}>Simpan</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      {/* Delete / Deactivate Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Konfirmasi Penonaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin menonaktifkan pengguna ini? Pengguna yang nonaktif tidak dapat login ke sistem.</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="danger" onClick={handleDelete}>Ya, Nonaktifkan</Button>
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
        </div>
      </Modal>

      {/* Reactivate Modal */}
      <Modal isOpen={!!reactivateConfirmId} onClose={() => setReactivateConfirmId(null)} title="Konfirmasi Pengaktifan">
        <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Apakah Anda yakin ingin mengaktifkan kembali pengguna ini?</p>
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
