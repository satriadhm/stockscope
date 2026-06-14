import { Suspense } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ApiKeysManager from '@/components/developer/ApiKeysManager';
import UsageDashboard from '@/components/developer/UsageDashboard';
import ScopeExplorer from '@/components/developer/ScopeExplorer';

export const metadata = {
  title: 'API Keys | Stockscope Developer',
  description: 'Manage your API keys and monitor usage',
};

async function getApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

async function getUserPlan(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan || 'free';
}

export default async function DeveloperApiKeysPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/developer/api-keys');
  }
  
  const [apiKeys, userPlan] = await Promise.all([
    getApiKeys(session.user.id),
    getUserPlan(session.user.id),
  ]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            API Keys
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your API keys and monitor usage across all endpoints
          </p>
        </div>
        
        {/* Plan Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
          </div>
        </div>
        
        {/* Scope Explorer */}
        <div className="mb-8">
          <Suspense fallback={<div className="animate-pulse h-64 bg-white dark:bg-slate-800 rounded-xl" />}>
            <ScopeExplorer plan={userPlan} />
          </Suspense>
        </div>
        
        {/* API Keys Manager */}
        <div className="mb-8">
          <Suspense fallback={<div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-xl" />}>
            <ApiKeysManager 
              initialKeys={apiKeys} 
              userPlan={userPlan}
            />
          </Suspense>
        </div>
        
        {/* Usage Dashboard */}
        {apiKeys.length > 0 && (
          <div className="mt-8">
            <Suspense fallback={<div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-xl" />}>
              <UsageDashboard 
                apiKeys={apiKeys}
                userId={session.user.id}
              />
            </Suspense>
          </div>
        )}
        
        {/* Empty State */}
        {apiKeys.length === 0 && (
          <div className="mt-8 text-center py-12 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
            <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No API Keys Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create your first API key to start integrating with Stockscope
            </p>
          </div>
        )}
        
        {/* Documentation Link */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                API Documentation
              </h4>
              <p className="text-blue-700 dark:text-blue-300 mb-3">
                Learn how to authenticate requests, handle rate limits, and integrate our endpoints.
              </p>
              <Link
                href="/docs/api"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                View API Docs
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
