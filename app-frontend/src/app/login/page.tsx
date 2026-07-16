'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import styles from './Login.module.css';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg('');
    try {
      // 1. Send Login Request
      const response = await api.post('/auth/login', data);
      const { accessToken } = response.data.data || response.data;
      
      // 2. Save Token
      localStorage.setItem('accessToken', accessToken);
      
      // 3. Get User Profile
      const profileRes = await api.get('/users/me');
      
      // 4. Save to Store and Redirect
      const userProfile = profileRes.data.data || profileRes.data;
      if (userProfile.role && typeof userProfile.role === 'object') {
        userProfile.role = userProfile.role.name;
      }
      setUser(userProfile);
      router.push('/dashboard');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setErrorMsg(error.response?.data?.message || 'Gagal login. Periksa kembali email dan kata sandi Anda.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.blob}></div>
      <div className={styles.blob2}></div>
      
      <div className={`${styles.loginBox} glass-card`}>
        <div className={styles.loginHeader}>
          <h1 className="text-gradient">HelpDeskPro</h1>
          <p>Login ke portal manajemen layanan IT Anda</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.loginForm}>
          {errorMsg && (
            <div className={styles.alertError}>
              {errorMsg}
            </div>
          )}
          
          <Input 
            label="Alamat Email" 
            type="email" 
            placeholder="admin@helpdeskpro.id" 
            {...register('email')}
            error={errors.email?.message}
          />
          
          <Input 
            label="Kata Sandi" 
            type="password" 
            placeholder="••••••••" 
            {...register('password')}
            error={errors.password?.message}
          />
          
          <div className={styles.forgotPassword}>
            <a href="#">Lupa kata sandi?</a>
          </div>
          
          <Button type="submit" size="lg" className={styles.submitBtn} isLoading={isSubmitting}>
            Masuk
          </Button>
        </form>
        
        <div className={styles.demoHints}>
          <strong>Akun Demo:</strong><br/>
          Admin: <code>admin@helpdeskpro.id</code> (Admin@123)<br/>
          Karyawan: <code>karyawan1@helpdeskpro.id</code> (User@123)
        </div>
      </div>
    </div>
  );
}
