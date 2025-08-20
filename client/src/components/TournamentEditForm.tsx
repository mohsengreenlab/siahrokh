import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tournament } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';

const editTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  isOpen: z.boolean(),
  venueAddress: z.string().min(1, 'Venue address is required'),
  venueInfo: z.string().optional(),
  registrationFee: z.string().min(1, 'Registration fee is required')
});

interface TournamentEditFormProps {
  tournament: Tournament;
}

export function TournamentEditForm({ tournament }: TournamentEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof editTournamentSchema>>({
    resolver: zodResolver(editTournamentSchema),
    defaultValues: {
      name: tournament.name,
      date: new Date(tournament.date).toISOString().split('T')[0],
      time: tournament.time,
      isOpen: tournament.isOpen,
      venueAddress: tournament.venueAddress,
      venueInfo: tournament.venueInfo || '',
      registrationFee: tournament.registrationFee || ''
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editTournamentSchema>) => {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tournament');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Tournament updated successfully' });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments/next'] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Error updating tournament', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete tournament');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Tournament deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments/next'] });
    },
    onError: () => {
      toast({ title: 'Error deleting tournament', variant: 'destructive' });
    }
  });

  const onSubmit = (data: z.infer<typeof editTournamentSchema>) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this tournament? This will also delete all registrations.')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            data-testid={`button-edit-${tournament.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Tournament</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-edit-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-gray-800 border-gray-600 text-white"
                          data-testid="input-edit-date"
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
                      <FormLabel className="text-gray-300">Time</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venueAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Venue Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-edit-venue-address"
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
                    <FormLabel className="text-gray-300">Extra Info</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="textarea-edit-venue-info"
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
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="e.g., 250,000 Tomans"
                        data-testid="input-edit-registration-fee"
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
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-gray-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                        data-testid="checkbox-edit-is-open"
                      />
                    </FormControl>
                    <FormLabel className="text-gray-300 text-sm font-normal">
                      Open for registration
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-tournament"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className="bg-red-700 border-red-600 text-red-300 hover:bg-red-600"
        data-testid={`button-delete-${tournament.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}