import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tournament, Registration } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { TournamentEditForm } from '@/components/TournamentEditForm';
import { TimePicker } from '@/components/ui/time-picker';
import { LogOut, Calendar, Filter } from 'lucide-react';

const tournamentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  isOpen: z.boolean(),
  venueAddress: z.string().min(1, 'Venue address is required'),
  venueInfo: z.string().optional(),
  registrationFee: z.string().min(1, 'Registration fee is required')
});

export default function Admin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Update URL with date filter
  useEffect(() => {
    const url = new URL(window.location.href);
    if (dateFilter) {
      url.searchParams.set('from', dateFilter);
    } else {
      url.searchParams.delete('from');
    }
    window.history.replaceState({}, '', url.toString());
  }, [dateFilter]);

  // Load date filter from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromParam = url.searchParams.get('from');
    if (fromParam) {
      setDateFilter(fromParam);
    }
  }, []);

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: '',
      date: '',
      time: '',
      isOpen: false,
      venueAddress: '',
      venueInfo: '',
      registrationFee: ''
    }
  });

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ['/api/admin/tournaments', dateFilter],
    queryFn: async () => {
      const url = `/api/admin/tournaments${dateFilter ? `?from=${dateFilter}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tournaments');
      return response.json();
    },
    enabled: isAuthenticated
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ['/api/admin/registrations', selectedTournamentId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/registrations?tournamentId=${selectedTournamentId}`);
      if (!response.ok) throw new Error('Failed to fetch registrations');
      return response.json();
    },
    enabled: !!selectedTournamentId
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tournamentSchema>) => {
      const response = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          date: new Date(data.date + 'T' + data.time).toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to create tournament');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Tournament created successfully' });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments/next'] });
    },
    onError: () => {
      toast({ title: 'Error creating tournament', variant: 'destructive' });
    }
  });

  const setNextTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch('/api/admin/next-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId })
      });
      if (!response.ok) throw new Error('Failed to set next tournament');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Next tournament set successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments/next'] });
    },
    onError: () => {
      toast({ title: 'Error setting next tournament', variant: 'destructive' });
    }
  });

  const confirmCertificateMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await fetch(`/api/admin/registrations/${registrationId}/confirm-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to confirm certificate');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Certificate confirmed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/registrations', selectedTournamentId] });
    },
    onError: () => {
      toast({ title: 'Error confirming certificate', variant: 'destructive' });
    }
  });

  const handleConfirmCertificate = (registrationId: string) => {
    confirmCertificateMutation.mutate(registrationId);
  };

  const onSubmit = (data: z.infer<typeof tournamentSchema>) => {
    createTournamentMutation.mutate(data);
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Logged out successfully' });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-chess-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">{t('admin.dashboard')}</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">English Interface</div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              size="sm"
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-chess-card rounded-xl p-4 mb-8 border border-gray-700">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <label className="text-gray-300 font-medium">Show tournaments on/after:</label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-chess-dark border-gray-600 text-white w-auto"
              data-testid="input-date-filter"
            />
            {dateFilter && (
              <Button 
                onClick={() => setDateFilter('')}
                variant="outline" 
                size="sm"
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Tournament Form */}
          <div className="bg-chess-card rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">{t('admin.createTournament')}</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('admin.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-chess-dark border-gray-600 text-white"
                          placeholder="Tournament Name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('admin.date')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-chess-dark border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('admin.time')}</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-chess-dark border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isOpen"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-white"
                        />
                      </FormControl>
                      <FormLabel className="text-gray-300">{t('admin.openForRegistration')}</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venueAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('admin.venueAddress')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="bg-chess-dark border-gray-600 text-white"
                          placeholder="Venue Address"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venueInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('admin.venueInfo')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="bg-chess-dark border-gray-600 text-white"
                          placeholder="Additional Venue Information"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Registration Fee</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-chess-dark border-gray-600 text-white"
                          placeholder="e.g., 250,000 Tomans"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createTournamentMutation.isPending}
                  className="w-full bg-white hover:bg-gray-200 text-black font-medium"
                >
                  {createTournamentMutation.isPending ? 'Creating...' : t('admin.create')}
                </Button>
              </form>
            </Form>
          </div>

          {/* Tournament List */}
          <div className="bg-chess-card rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">{t('admin.tournamentList')}</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="flex justify-between items-center p-3 bg-chess-dark rounded">
                  <div>
                    <h3 className="text-white font-medium">{tournament.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(tournament.date).toLocaleDateString()} - {tournament.time}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      tournament.isOpen ? 'bg-gray-200 text-black' : 'bg-gray-600 text-white'
                    }`}>
                      {tournament.isOpen ? 'Open' : 'Closed'}
                    </span>
                    <TournamentEditForm tournament={tournament} />
                    <Button
                      size="sm"
                      onClick={() => setNextTournamentMutation.mutate(tournament.id)}
                      className="bg-white hover:bg-gray-200 text-black text-xs"
                      data-testid={`button-set-next-${tournament.id}`}
                    >
                      Set as Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTournamentId(tournament.id)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs"
                      data-testid={`button-view-registrations-${tournament.id}`}
                    >
                      View Registrations
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registrations */}
        {selectedTournamentId && (
          <div className="mt-8 bg-chess-card rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">{t('admin.registrations')}</h2>
              <div className="text-sm text-gray-400">
                {registrations.length} participant{registrations.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="p-3 text-gray-300 font-medium">Full Name</th>
                    <th className="p-3 text-gray-300 font-medium">Year of Birth</th>
                    <th className="p-3 text-gray-300 font-medium">Phone Number</th>
                    <th className="p-3 text-gray-300 font-medium">Notes</th>
                    <th className="p-3 text-gray-300 font-medium">Certificate Status</th>
                    <th className="p-3 text-gray-300 font-medium">Registration Date</th>
                    <th className="p-3 text-gray-300 font-medium">Receipt File</th>
                    <th className="p-3 text-gray-300 font-medium">Certificate ID</th>
                    <th className="p-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                      <td className="p-3 text-white font-medium">{registration.name}</td>
                      <td className="p-3 text-gray-300">{registration.yearOfBirth || '—'}</td>
                      <td className="p-3 text-gray-300 font-mono">{registration.phone}</td>
                      <td className="p-3 text-gray-300 max-w-xs">
                        {registration.description ? (
                          <div className="truncate" title={registration.description}>
                            {registration.description}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          registration.certificateConfirmed 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {registration.certificateConfirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">
                        {new Date(registration.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        {registration.receiptFilePath ? (
                          <a
                            href={`/uploads/${registration.receiptFilePath.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <span>View File</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-500">No file</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-xs">
                        <button 
                          onClick={() => navigator.clipboard.writeText(registration.certificateId)}
                          className="truncate max-w-24 hover:bg-gray-700 px-1 py-1 rounded transition-colors"
                          title={`Click to copy: ${registration.certificateId}`}
                        >
                          {registration.certificateId}
                        </button>
                      </td>
                      <td className="p-3">
                        {!registration.certificateConfirmed && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmCertificate(registration.id)}
                            className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1"
                          >
                            Confirm Certificate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registrations.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">No registrations yet</div>
                  <div className="text-gray-400 text-sm">Participants will appear here once they register for this tournament</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
