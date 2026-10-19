'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // 已登录用户访问登录页时自动跳转到管理后台
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/admin');
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('用户名或密码错误');
      } else {
        // 使用 replace 避免回退到登录页，确保会话已就绪后再跳转
        router.replace('/admin');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 会话加载中或已登录时不渲染登录表单
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          跳转中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* 登录卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <BuildingOffice2Icon className="w-8 h-8 text-blue-800" />
            </div>
            <h1 className="text-2xl font-semibold text-blue-900 mb-2">
              宿舍管理系统
            </h1>
            <p className="text-sm text-slate-500">
              一站式数字化宿舍管理平台
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名输入 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4 border border-slate-200 rounded-lg
                         text-slate-900 placeholder-slate-400
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         transition-all duration-200 outline-none"
                placeholder="请输入用户名"
                autoComplete="username"
                required
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 border border-slate-200 rounded-lg
                         text-slate-900 placeholder-slate-400
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         transition-all duration-200 outline-none"
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 
                            px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 
                       disabled:bg-amber-300
                       text-white font-medium rounded-lg
                       transition-all duration-200 
                       focus:ring-2 focus:ring-amber-300 focus:outline-none
                       cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" 
                            stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* 演示账号提示 - 醒目大字体 */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-xs font-medium text-amber-700 mb-2">
                演示账号
              </p>
              <p className="text-lg font-bold text-amber-800">
                admin <span className="text-amber-600">/</span> admin123
              </p>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 宿舍管理系统. All rights reserved.
        </p>
      </div>
    </div>
  );
}
