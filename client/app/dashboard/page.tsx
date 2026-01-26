'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, LogOut, Settings, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { token, clearAuth, isAuthenticated } = useAuthStore();
  const api = new ApiClient(() => token);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30000, // 30 seconds
    enabled: isAuthenticated(),
  });

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'online':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'offline':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-red-600">HOMELABFLIX</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/integrations">
              <Button variant="outline" size="sm" className="border-slate-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading dashboard...</p>
            </div>
          </div>
        ) : !dashboard || dashboard.categories.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">No Integrations Yet</h2>
            <p className="text-slate-400 mb-8">
              Get started by adding your first integration
            </p>
            <Link href="/integrations">
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {dashboard.categories.map((category: any) => (
              <div key={category.name} className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-200">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {category.tiles.map((tile: any) => (
                    <Card
                      key={tile.id}
                      className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{tile.name}</CardTitle>
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(tile.status)}`} />
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(tile.status)}
                          className="w-fit mt-2"
                        >
                          {tile.status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tile.metrics.map((metric: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-slate-400">
                              {metric.label}:
                            </span>
                            <span className="font-medium">
                              {metric.value}
                              {metric.unit || ''}
                            </span>
                          </div>
                        ))}
                        <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                          Updated: {new Date(tile.lastUpdated).toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
