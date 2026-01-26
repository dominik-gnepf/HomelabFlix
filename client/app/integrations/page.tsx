'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';

export default function IntegrationsPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const api = new ApiClient(() => token);
  const queryClient = useQueryClient();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: integrations, isLoading: loadingIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.getIntegrations(),
    enabled: isAuthenticated(),
  });

  const { data: adapters, isLoading: loadingAdapters } = useQuery({
    queryKey: ['adapters'],
    queryFn: () => api.getAdapters(),
    enabled: isAuthenticated(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createIntegration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowAddDialog(false);
      setSelectedAdapter(null);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateIntegration(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdapter) return;

    createMutation.mutate({
      name: formData.name,
      adapterId: selectedAdapter.id,
      config: formData,
    });
  };

  const handleAdapterSelect = (adapterId: string) => {
    const adapter = adapters?.find((a: any) => a.id === adapterId);
    setSelectedAdapter(adapter);
    setFormData({ name: adapter?.name || '' });
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <header className="border-b border-slate-800 bg-slate-950/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Integrations</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <p className="text-slate-400">
            Manage your homelab service integrations
          </p>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Integration</DialogTitle>
                <DialogDescription>
                  Connect a new service to your dashboard
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Service</Label>
                  <Select onValueChange={handleAdapterSelect}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {loadingAdapters ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        adapters?.map((adapter: any) => (
                          <SelectItem key={adapter.id} value={adapter.id}>
                            {adapter.name}
                            {!adapter.implemented && (
                              <Badge variant="secondary" className="ml-2">
                                Coming Soon
                              </Badge>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAdapter && (
                  <>
                    {!selectedAdapter.implemented && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm text-yellow-500">
                        This adapter is not yet implemented. It will be available in a future update.
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="My Server"
                        className="bg-slate-800 border-slate-700"
                        required
                      />
                    </div>

                    {Object.entries(selectedAdapter.configSchema).map(([key, field]: [string, any]) => (
                      <div key={key} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-xs text-slate-400">{field.description}</p>
                        )}
                        <div className="relative">
                          <Input
                            type={field.type === 'password' && !showPasswords[key] ? 'password' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                            value={formData[key] || ''}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            placeholder={field.placeholder || ''}
                            className="bg-slate-800 border-slate-700"
                            required={field.required}
                          />
                          {field.type === 'password' && (
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                              {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={createMutation.isPending || !selectedAdapter.implemented}
                    >
                      {createMutation.isPending ? 'Adding...' : 'Add Integration'}
                    </Button>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingIntegrations ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : !integrations || integrations.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold mb-4">No Integrations</h2>
            <p className="text-slate-400 mb-8">Add your first integration to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration: any) => (
              <Card key={integration.id} className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {integration.adapterId}
                      </CardDescription>
                    </div>
                    <Badge>{integration.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Enabled</span>
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: integration.id, enabled: checked })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this integration?')) {
                          deleteMutation.mutate(integration.id);
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
