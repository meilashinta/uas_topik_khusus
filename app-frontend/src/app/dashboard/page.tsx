'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { FiCheckCircle, FiClock, FiAlertTriangle, FiInbox } from 'react-icons/fi';
import styles from './Dashboard.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [isAuthenticated, router, mounted]);

  if (!mounted || !isAuthenticated) return null;

  // Mock data for presentation based on UI plan
  const lineChartData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Tiket Selesai',
        data: [12, 19, 15, 25, 22, 10, 8],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Tiket Masuk',
        data: [18, 15, 20, 22, 28, 12, 5],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [12, 45, 30],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8' }
      }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.welcomeSection}>
        <h1 className="text-gradient">Selamat Datang, {user?.name}!</h1>
        <p>Berikut adalah ringkasan aktivitas layanan IT Anda hari ini.</p>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} glass-panel`}>
          <div className={styles.metricIcon} style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
            <FiInbox />
          </div>
          <div className={styles.metricInfo}>
            <h3>Total Tiket</h3>
            <p className={styles.metricValue}>128</p>
          </div>
        </div>

        <div className={`${styles.metricCard} glass-panel`}>
          <div className={styles.metricIcon} style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
            <FiClock />
          </div>
          <div className={styles.metricInfo}>
            <h3>Dalam Proses (SLA)</h3>
            <p className={styles.metricValue}>45</p>
          </div>
        </div>

        <div className={`${styles.metricCard} glass-panel`}>
          <div className={styles.metricIcon} style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
            <FiAlertTriangle />
          </div>
          <div className={styles.metricInfo}>
            <h3>SLA Terlanggar</h3>
            <p className={styles.metricValue}>3</p>
          </div>
        </div>

        <div className={`${styles.metricCard} glass-panel`}>
          <div className={styles.metricIcon} style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
            <FiCheckCircle />
          </div>
          <div className={styles.metricInfo}>
            <h3>Diselesaikan</h3>
            <p className={styles.metricValue}>80</p>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} glass-panel`}>
          <h3>Tren Penyelesaian Tiket</h3>
          <div className={styles.chartWrapper}>
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className={`${styles.chartCard} glass-panel`}>
          <h3>Distribusi Prioritas</h3>
          <div className={styles.chartWrapper}>
            <Doughnut 
              data={doughnutData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } 
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
