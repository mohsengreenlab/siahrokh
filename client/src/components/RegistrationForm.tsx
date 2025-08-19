import { useState, useRef, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const createFormSchema = (t: (key: string) => string) => z.object({
  name: z.string()
    .min(1, t('errors.required'))
    .min(2, t('errors.nameMin')),
  phone: z.string()
    .min(1, t('errors.required'))
    .min(10, t('errors.phoneMin'))
    .regex(/^[0-9+\-\s()]+$/, t('errors.invalidPhone')),
  email: z.string()
    .min(1, t('errors.required'))
    .email(t('errors.invalidEmail')),
  yearOfBirth: z.string()
    .min(1, t('errors.required'))
    .regex(/^\d{4}$/, t('errors.invalidYear')),
  receiptFile: z.instanceof(File, { message: t('errors.fileRequired') })
    .refine((file) => file.size <= 10 * 1024 * 1024, t('errors.fileTooLarge'))
    .refine(
      (file) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        return allowedTypes.includes(file.type);
      },
      t('errors.invalidFileType')
    ),
  description: z.string().optional(),
  agreedTos: z.boolean().refine((val) => val === true, t('errors.tosRequired'))
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
  const [isUploading, setIsUploading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const formSchema = createFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      yearOfBirth: '',
      description: '',
      agreedTos: false
    }
  });

  // Focus management for accessibility
  useEffect(() => {
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorSummaryRef.current.focus();
    }
  }, [form.formState.errors]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('tournamentId', tournament.id);
      formData.append('name', data.name);
      formData.append('phone', data.phone);
      formData.append('email', data.email);
      formData.append('yearOfBirth', data.yearOfBirth);
      formData.append('receiptFile', data.receiptFile);
      formData.append('description', data.description || '');
      formData.append('agreedTos', data.agreedTos.toString());

      const response = await fetch('/api/registrations', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error('Registration failed');
        (error as any).serverErrors = errorData.errors || [errorData.error || 'Registration failed'];
        throw error;
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setServerErrors([]);
      toast({
        title: t('registration.success'),
        description: t('registration.successSubtitle')
      });
      onSuccess(data.registration, data.tournament);
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: any) => {
      setIsUploading(false);
      let errorMessages: string[] = [];
      
      // Check if server errors are attached to the error object
      if (error.serverErrors && Array.isArray(error.serverErrors)) {
        errorMessages = error.serverErrors;
      } else if (error.message) {
        errorMessages = [error.message];
      } else {
        errorMessages = [t('errors.serverError')];
      }
      
      setServerErrors(errorMessages);
      toast({
        title: 'Error',
        description: errorMessages[0],
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
    
    // Show success message
    toast({
      title: t('registration.uploadSuccess'),
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    });
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
    setServerErrors([]); // Clear previous server errors
    mutation.mutate(data);
  };

  // Get form validation errors for summary
  const getValidationErrors = () => {
    const errors = form.formState.errors;
    const errorList: string[] = [];
    
    if (errors.name) errorList.push(errors.name.message || t('errors.required'));
    if (errors.phone) errorList.push(errors.phone.message || t('errors.invalidPhone'));
    if (errors.email) errorList.push(errors.email.message || t('errors.invalidEmail'));
    if (errors.yearOfBirth) errorList.push(errors.yearOfBirth.message || t('errors.required'));
    if (errors.receiptFile) errorList.push(errors.receiptFile.message || t('errors.fileRequired'));
    if (errors.agreedTos) errorList.push(errors.agreedTos.message || t('errors.tosRequired'));
    
    return errorList;
  };

  const validationErrors = getValidationErrors();
  const hasErrors = validationErrors.length > 0 || serverErrors.length > 0;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-chess-black">
      <div className="max-w-2xl mx-auto">
        <div className="bg-chess-card rounded-xl p-8 border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{t('registration.title')}</h2>
            <p className="text-white font-medium">{tournament.name}</p>
          </div>

          {/* Error Summary */}
          {hasErrors && (
            <div 
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="error-summary-title"
              className="mb-6"
            >
              <Alert className="border-red-600 bg-red-900/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription>
                  <div id="error-summary-title" className="font-semibold text-red-400 mb-2">
                    {t('errors.validationSummary')}
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-300">
                    {validationErrors.map((error, index) => (
                      <li key={`validation-${index}`}>{error}</li>
                    ))}
                    {serverErrors.map((error, index) => (
                      <li key={`server-${index}`}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                        data-testid="input-name"
                        className={`bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400 ${
                          form.formState.errors.name ? 'border-red-500 focus:border-red-400' : ''
                        }`}
                        placeholder={t('registration.fullName')}
                        aria-invalid={!!form.formState.errors.name}
                        aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
                      />
                    </FormControl>
                    <FormMessage 
                      id="name-error" 
                      className="text-red-400" 
                    />
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
                        data-testid="input-phone"
                        className={`bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400 ${
                          form.formState.errors.phone ? 'border-red-500 focus:border-red-400' : ''
                        }`}
                        placeholder="09123456789"
                        aria-invalid={!!form.formState.errors.phone}
                        aria-describedby={form.formState.errors.phone ? 'phone-error' : undefined}
                      />
                    </FormControl>
                    <FormMessage 
                      id="phone-error" 
                      className="text-red-400" 
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {t('registration.email')} <span className="text-gray-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        data-testid="input-email"
                        className={`bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400 ${
                          form.formState.errors.email ? 'border-red-500 focus:border-red-400' : ''
                        }`}
                        placeholder="example@email.com"
                        aria-invalid={!!form.formState.errors.email}
                        aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                      />
                    </FormControl>
                    <FormMessage 
                      id="email-error" 
                      className="text-red-400" 
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {t('registration.yearOfBirth')} <span className="text-gray-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="1990"
                        maxLength={4}
                        data-testid="input-year-of-birth"
                        className={`bg-chess-dark border-gray-600 text-white placeholder-gray-400 focus:border-gray-400 ${
                          form.formState.errors.yearOfBirth ? 'border-red-500 focus:border-red-400' : ''
                        }`}
                        aria-invalid={!!form.formState.errors.yearOfBirth}
                        aria-describedby={form.formState.errors.yearOfBirth ? 'year-error' : undefined}
                      />
                    </FormControl>
                    <FormMessage 
                      id="year-error" 
                      className="text-red-400" 
                    />
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
                        className={`file-upload-area rounded-lg p-6 text-center cursor-pointer border-2 border-dashed transition-colors ${
                          isDragOver 
                            ? 'border-white bg-gray-800' 
                            : form.formState.errors.receiptFile
                            ? 'border-red-500 bg-red-900/10'
                            : 'border-gray-600 bg-chess-dark hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            document.getElementById('file-input')?.click();
                          }
                        }}
                        aria-label={t('registration.fileUpload')}
                        aria-invalid={!!form.formState.errors.receiptFile}
                        aria-describedby={form.formState.errors.receiptFile ? 'file-error' : undefined}
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-600 border-t-white rounded-full mb-4"></div>
                            <p className="text-white mb-2">{t('registration.uploading')}</p>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-4"></i>
                            <p className="text-gray-300 mb-2">{t('registration.fileUpload')}</p>
                            <p className="text-gray-500 text-sm">{t('registration.fileSize')}</p>
                          </>
                        )}
                        <input
                          id="file-input"
                          type="file"
                          data-testid="input-receipt"
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
                    <FormMessage 
                      id="file-error" 
                      className="text-red-400" 
                    />
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
                        data-testid="checkbox-terms"
                        className={`data-[state=checked]:bg-white data-[state=checked]:border-white ${
                          form.formState.errors.agreedTos ? 'border-red-500' : ''
                        }`}
                        aria-invalid={!!form.formState.errors.agreedTos}
                        aria-describedby={form.formState.errors.agreedTos ? 'tos-error' : undefined}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-gray-300 text-sm">
                        {t('registration.agreeTerms')} <span className="text-gray-400">*</span>
                      </FormLabel>
                      {form.formState.errors.agreedTos && (
                        <FormMessage 
                          id="tos-error" 
                          className="text-red-400 text-sm" 
                        />
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  data-testid="button-submit"
                  disabled={mutation.isPending || isUploading}
                  className="flex-1 bg-white hover:bg-gray-200 text-black font-semibold py-4 px-6 rounded-lg disabled:opacity-50"
                >
                  {mutation.isPending || isUploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mx-2"></i>
                      {isUploading ? t('registration.uploading') : t('registration.submit')}
                    </>
                  ) : (
                    t('registration.submit')
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={onCancel}
                  data-testid="button-cancel"
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
