import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tournament, Registration } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(1, 'required'),
  phone: z.string().min(10, 'invalidPhone'),
  receiptFile: z.instanceof(File).refine((file) => file.size <= 10 * 1024 * 1024, 'fileTooLarge'),
  description: z.string().optional(),
  agreedTos: z.boolean().refine((val) => val === true, 'required')
});

interface RegistrationFormProps {
  tournament: Tournament;
  onSuccess: (registration: Registration, tournament: Tournament) => void;
  onCancel: () => void;
}

export function RegistrationForm({ tournament, onSuccess, onCancel }: RegistrationFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      description: '',
      agreedTos: false
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const formData = new FormData();
      formData.append('tournamentId', tournament.id);
      formData.append('name', data.name);
      formData.append('phone', data.phone);
      formData.append('receiptFile', data.receiptFile);
      formData.append('description', data.description || '');
      formData.append('agreedTos', data.agreedTos.toString());

      const response = await fetch('/api/registrations', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('registration.success'),
        description: t('registration.successSubtitle')
      });
      onSuccess(data.registration, data.tournament);
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: t('errors.fileTooLarge'),
        variant: 'destructive'
      });
      return;
    }
    setUploadedFile(file);
    form.setValue('receiptFile', file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-chess-black">
      <div className="max-w-2xl mx-auto">
        <div className="bg-chess-card rounded-xl p-8 border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{t('registration.title')}</h2>
            <p className="text-white font-medium">{tournament.name}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {t('registration.fullName')} <span className="text-gray-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400"
                        placeholder={t('registration.fullName')}
                      />
                    </FormControl>
                    <FormMessage className="text-gray-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {t('registration.phone')} <span className="text-gray-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        className="bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400"
                        placeholder="09123456789"
                      />
                    </FormControl>
                    <FormMessage className="text-gray-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {t('registration.receipt')} <span className="text-gray-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <div
                        className={`file-upload-area rounded-lg p-6 text-center cursor-pointer ${
                          isDragOver ? 'dragover' : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                      >
                        <i className="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-4"></i>
                        <p className="text-gray-300 mb-2">{t('registration.fileUpload')}</p>
                        <p className="text-gray-500 text-sm">{t('registration.fileSize')}</p>
                        <input
                          id="file-input"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </div>
                    </FormControl>
                    {uploadedFile && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between bg-chess-dark rounded-lg p-3 border border-gray-600">
                          <div className="flex items-center">
                            <i className="fas fa-file-image text-gray-400 mx-3"></i>
                            <span className="text-white text-sm">{uploadedFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null);
                              form.setValue('receiptFile', undefined as any);
                            }}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    )}
                    <FormMessage className="text-gray-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('registration.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        className="bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400 resize-none"
                        placeholder={t('registration.notes')}
                      />
                    </FormControl>
                    <FormMessage className="text-gray-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agreedTos"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-white data-[state=checked]:border-white"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-gray-300 text-sm">
                        {t('registration.agreeTerms')} <span className="text-gray-400">*</span>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 bg-white hover:bg-gray-200 text-black font-semibold py-4 px-6 rounded-lg"
                >
                  {mutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mx-2"></i>
                      {t('registration.submit')}
                    </>
                  ) : (
                    t('registration.submit')
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
