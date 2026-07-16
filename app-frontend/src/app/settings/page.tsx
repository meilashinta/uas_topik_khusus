'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h3>Pengaturan Sistem (Administrator)</h3>
      <p className="text-muted" style={{ marginTop: '1rem', lineHeight: '1.6' }}>
        Selamat datang di dasbor administrasi. Gunakan tab navigasi di atas untuk mengelola data utama sistem, termasuk:
      </p>
      <ul style={{ marginTop: '1rem', marginLeft: '1.5rem', color: 'var(--color-text-muted)' }}>
        <li><strong>Users:</strong> Kelola akun pengguna, peran, dan penugasan departemen.</li>
        <li><strong>Departments:</strong> Atur struktur organisasi dan kode departemen.</li>
        <li><strong>Categories:</strong> Kelola kategori tiket yang dapat dipilih pengguna.</li>
        <li><strong>Priorities & SLA:</strong> Tentukan level prioritas beserta target waktu respons dan penyelesaian (SLA).</li>
      </ul>
    </div>
  );
}
