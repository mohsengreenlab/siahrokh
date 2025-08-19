import { useState } from 'react';
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

const tournamentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  isOpen: z.boolean(),
  venueAddress: z.string().min(1, 'Venue address is required'),
  venueInfo: z.string().optional()
});

export default function Admin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: '',
      date: '',
      time: '',
      isOpen: false,
      venueAddress: '',
      venueInfo: ''
    }
  });

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ['/api/admin/tournaments']
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ['/api/admin/registrations', selectedTournamentId],
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

  const onSubmit = (data: z.infer<typeof tournamentSchema>) => {
    createTournamentMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-chess-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">{t('admin.dashboard')}</h1>
          <div className="text-sm text-gray-400">English Interface</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Tournament Form */}
          <div className="bg-chess-card rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-chess-accent mb-4">{t('admin.createTournament')}</h2>
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
                        <Input
                          {...field}
                          type="time"
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
                          className="data-[state=checked]:bg-chess-accent"
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

                <Button
                  type="submit"
                  disabled={createTournamentMutation.isPending}
                  className="w-full bg-chess-accent hover:bg-amber-600 text-black font-medium"
                >
                  {createTournamentMutation.isPending ? 'Creating...' : t('admin.create')}
                </Button>
              </form>
            </Form>
          </div>

          {/* Tournament List */}
          <div className="bg-chess-card rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-chess-accent mb-4">{t('admin.tournamentList')}</h2>
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
                      tournament.isOpen ? 'bg-chess-success' : 'bg-gray-500'
                    }`}>
                      {tournament.isOpen ? 'Open' : 'Closed'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setNextTournamentMutation.mutate(tournament.id)}
                      className="bg-chess-accent hover:bg-amber-600 text-black text-xs"
                    >
                      Set as Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTournamentId(tournament.id)}
                      className="border-gray-600 text-gray-300 hover:bg-chess-dark text-xs"
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
            <h2 className="text-xl font-semibold text-chess-accent mb-4">{t('admin.registrations')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="p-2 text-gray-300">Name</th>
                    <th className="p-2 text-gray-300">Phone</th>
                    <th className="p-2 text-gray-300">Registration Date</th>
                    <th className="p-2 text-gray-300">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="border-b border-gray-700">
                      <td className="p-2 text-white">{registration.name}</td>
                      <td className="p-2 text-gray-300">{registration.phone}</td>
                      <td className="p-2 text-gray-300">
                        {new Date(registration.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <a
                          href={`/${registration.receiptFilePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-chess-accent hover:underline"
                        >
                          View Receipt
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registrations.length === 0 && (
                <p className="text-gray-400 text-center py-8">No registrations found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
