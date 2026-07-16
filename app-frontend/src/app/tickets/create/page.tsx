'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FiArrowLeft, FiUploadCloud } from 'react-icons/fi';
import Link from 'next/link';
import styles from './CreateTicket.module.css';

const createSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
  categoryId: z.string().min(1, 'Pilih kategori'),
  priorityId: z.string(),
});

type CreateForm = z.infer<typeof createSchema>;

interface Category {
  id: string;
  name: string;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; name: string; level: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && typeof window !== 'undefined') {
      router.push('/login');
      return;
    }

    if (_hasHydrated && user?.role && user.role !== 'EMPLOYEE') {
      // Hanya EMPLOYEE yang boleh membuat tiket
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const catRes = await api.get('/categories');
        const prioRes = await api.get('/priorities');
        setCategories(catRes.data.data.data || []);
        setPriorities(prioRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch ticket metadata', err);
      }
    };

    if (_hasHydrated && isAuthenticated) {
      fetchData();
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const onSubmit = async (data: CreateForm) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await api.post('/tickets', data);
      router.push('/tickets');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat membuat tiket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'EMPLOYEE') return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/tickets" className={styles.backLink}>
          <FiArrowLeft /> Kembali ke Daftar Tiket
        </Link>
        <h1 className="text-gradient">Buat Tiket Baru</h1>
        <p>Jelaskan masalah atau permintaan Anda secara detail.</p>
      </div>

      <div className={`${styles.formCard} glass-panel`}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}

          <Input
            label="Judul Tiket"
            placeholder="Contoh: Printer di lantai 3 rusak"
            {...register('title')}
            error={errors.title?.message}
          />

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Kategori</label>
              <select className={`${styles.select} ${errors.categoryId ? styles.hasError : ''}`} {...register('categoryId')}>
                <option value="">-- Pilih Kategori --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className={styles.errorText}>{errors.categoryId.message}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Prioritas</label>
              <select className={`${styles.select} ${errors.priorityId ? styles.hasError : ''}`} {...register('priorityId')}>
                <option value="">-- Pilih Prioritas --</option>
                {priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                ))}
              </select>
              {errors.priorityId && <span className={styles.errorText}>{errors.priorityId.message}</span>}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Deskripsi Masalah</label>
            <textarea
              className={`${styles.textarea} ${errors.description ? styles.hasError : ''}`}
              placeholder="Jelaskan detail masalah, kapan terjadinya, dan pesan error yang muncul (jika ada)..."
              rows={6}
              {...register('description')}
            ></textarea>
            {errors.description && <span className={styles.errorText}>{errors.description.message}</span>}
          </div>

          <div className={styles.fileUpload}>
            <div className={styles.uploadBox}>
              <FiUploadCloud size={32} color="var(--color-primary)" />
              <p>Seret dan lepas file di sini, atau <span>Pilih File</span></p>
              <span className={styles.uploadHint}>Format didukung: JPG, PNG, PDF (Maks 10MB)</span>
            </div>
          </div>

          <div className={styles.formActions}>
            <Link href="/tickets">
              <Button type="button" variant="ghost">Batal</Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>Kirim Tiket</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
