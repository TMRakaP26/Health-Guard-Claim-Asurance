import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useClaims } from '../state/ClaimContext';
import { useAuth } from '../state/AuthContext';
import apiClient from '../api/client';
import { Check, User, Calendar, Stethoscope, UploadCloud, FileText, Pencil, Activity, ChevronDown, X, Trash2, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------- UI Components ----------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 shadow-sm",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 focus:ring-slate-500 shadow-sm",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-blue-600 bg-white shadow-sm"
  };

  return <button className={cn(baseStyles, variants[variant], className)} {...props} />;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

function Input({ label, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
            icon && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}

function CurrencyInput({ label, className, value, onChange, ...props }: Omit<InputProps, 'icon'> & { value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  // Format number with comma thousand separators
  const displayValue = value ? value.toLocaleString('en-US') : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numericValue = raw ? parseInt(raw, 10) : 0;
    // Create a synthetic event with the numeric value
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: String(numericValue) },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <span className="text-slate-400 text-sm">Rp</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          required
          value={displayValue}
          onChange={handleChange}
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}

const COMMON_DISEASES = [
  'Flu (Influenza)',
  'Demam Berdarah Dengue (DBD)',
  'Malaria',
  'Diabetes Melitus',
  'Hipertensi (Darah Tinggi)',
  'Asma',
  'Pneumonia',
  'Tuberkulosis (TBC)',
  'Jantung Koroner',
  'Stroke',
  'Gagal Ginjal',
  'Covid-19',
  'Tipes (Demam Tifoid)',
  'Alergi',
  'Katarak',
  'Kanker',
];

// ---------------- Stepper Component ----------------

function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="w-full">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center w-full">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li key={step} className={cn("relative flex items-center", !isLast ? "flex-1" : "")}>
                <div className="flex items-center gap-2 group">
                  <div
                    className={cn(
                      "relative flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold transition-colors z-10 shrink-0",
                      isCompleted ? "bg-blue-600 text-white" : isCurrent ? "border border-blue-600 bg-blue-50 text-blue-600" : "border border-slate-200 bg-slate-50 text-slate-400"
                    )}
                  >
                    {isCompleted ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span>{stepNumber}</span>}
                  </div>
                  <span className={cn("text-[11px] font-medium mr-4 hidden sm:block whitespace-nowrap", isCurrent ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400")}>
                    {step}
                  </span>
                </div>
                {!isLast && (
                  <div className="flex-1 h-[1px] mx-2 sm:mx-4 bg-slate-200" aria-hidden="true">
                    <div className={cn("h-full transition-colors", isCompleted ? "bg-blue-600" : "bg-transparent")} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// ---------------- Steps ----------------

function PatientInfoStep({ formData, setFormData, isEdit }: any) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {isEdit ? "Edit Claim (Patient Information)" : "Submit New Claim (Patient Information)"}
        </h2>
        <p className="text-sm text-slate-500">Please enter the accurate personal details of the patient receiving the medical service.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
        <Input label="First Name" type="text" required icon={<User className="h-4 w-4" />} placeholder="e.g. John" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
        <Input label="Last Name" type="text" required icon={<User className="h-4 w-4" />} placeholder="e.g. Doe" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
        <Input label="Date of Birth" type="date" required icon={<Calendar className="h-4 w-4" />} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
        <Input label="BPJS Number" type="text" required icon={<CreditCard className="h-4 w-4" />} placeholder="e.g. 000123456789" value={formData.bpjsNumber} onChange={e => setFormData({...formData, bpjsNumber: e.target.value})} />
      </div>
    </div>
  );
}

function ProviderDetailsStep({ formData, setFormData, isEdit }: any) {
  const [showDropdown, setShowDropdown] = useState(false);
  const filteredDiseases = COMMON_DISEASES.filter(d => 
    d.toLowerCase().includes(formData.type?.toLowerCase() || '')
  );
  
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {isEdit ? "Edit Claim (Provider Details)" : "Submit New Claim (Provider Details)"}
        </h2>
        <p className="text-sm text-slate-500">Please enter the information of the healthcare provider and the service details.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
        <Input label="Date of Service" type="date" required icon={<Calendar className="h-4 w-4" />} value={formData.dateOfService} onChange={e => setFormData({...formData, dateOfService: e.target.value})} />
        <Input label="Provider Name" type="text" required icon={<Stethoscope className="h-4 w-4" />} placeholder="e.g. Dr. Jane Smith or General Hospital" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} />
        
        {/* Disease field with optional dropdown */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-sm font-medium text-slate-700">Disease / Condition <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Activity className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              placeholder="Type disease or select from list"
              value={formData.type}
              onChange={e => { setFormData({...formData, type: e.target.value}); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {showDropdown && filteredDiseases.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredDiseases.map(disease => (
                  <button
                    key={disease}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevents input blur
                      setFormData({...formData, type: disease});
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {disease}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <CurrencyInput label="Billed Amount" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
      </div>
    </div>
  );
}

interface UploadedFile {
  file: File;
  id: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

function UploadDocumentsStep({ isEdit, files, setFiles }: { isEdit: boolean; files: UploadedFile[]; setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {isEdit ? "Edit Claim (Upload Documents)" : "Submit New Claim (Upload Documents)"}
        </h2>
        <p className="text-sm text-slate-500">Please provide the itemized bill and any supporting medical records.</p>
      </div>
      <div className="space-y-8">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
        />
        <label
          htmlFor="file-upload-input"
          className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-colors cursor-pointer group block"
        >
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Click to upload or drag and drop</h3>
          <p className="text-xs text-slate-500">PDF, JPG, or PNG up to 10MB each</p>
        </label>

        {files.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">Selected Files ({files.length})</h4>
            <div className="space-y-3">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{f.file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(f.file.size)}</p>
                      {f.uploading && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                          <span className="text-xs text-blue-600">Uploading...</span>
                        </div>
                      )}
                      {f.uploaded && (
                        <span className="text-xs text-emerald-600 mt-0.5 block">Uploaded</span>
                      )}
                      {f.error && (
                        <span className="text-xs text-rose-600 mt-0.5 block">{f.error}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(f.id)}
                    className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewStep({ formData, isEdit, filesCount, isResubmit }: { formData: any; isEdit: boolean; filesCount: number; isResubmit?: boolean }) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {isResubmit ? "Resubmit Claim (Review)" : isEdit ? "Edit Claim (Review)" : "Submit New Claim (Review)"}
        </h2>
        <p className="text-sm text-slate-500">
          {isResubmit
            ? "Please review the updated information before resubmitting your claim."
            : "Please review the information below to ensure it is accurate before submitting."}
        </p>
      </div>
      <div className="space-y-8">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">Patient Information</h3>
            <button className="text-blue-600 hover:text-blue-700 p-1 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Full Name</span>
              <span className="font-medium text-slate-900">{formData.firstName} {formData.lastName}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Date of Birth</span>
              <span className="font-medium text-slate-900">{formData.dob || '—'}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">BPJS Number</span>
              <span className="font-medium text-slate-900">{formData.bpjsNumber || '—'}</span>
            </div>
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">Provider & Service Details</h3>
            <button className="text-blue-600 hover:text-blue-700 p-1 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Provider Name</span>
              <span className="font-medium text-slate-900">{formData.provider || 'Not provided'}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Disease / Condition</span>
              <span className="font-medium text-slate-900">{formData.type || 'Not provided'}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Billed Amount</span>
              <span className="font-medium text-slate-900">Rp {formData.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-xs mb-1.5">Documents</span>
              <span className="font-medium text-slate-900">{filesCount > 0 ? `${filesCount} file(s) attached` : 'No files attached'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Main Page Component ----------------

const STEPS = ['Patient Info', 'Provider Details', 'Upload Documents', 'Review'];

export function ClientClaimForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const { addClaim, updateClaim } = useClaims();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editClaim = location.state?.editClaim;
  
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  
  const userFullName = user?.name || '';
  const [firstNameDefault, lastNameDefault] = userFullName.includes(' ')
    ? [userFullName.split(' ')[0], userFullName.split(' ').slice(1).join(' ')]
    : [userFullName, ''];

  // Auto-fill DOB from user profile; format date_of_birth to YYYY-MM-DD for date input
  const userDob = user?.date_of_birth
    ? new Date(user.date_of_birth).toISOString().split('T')[0]
    : '';
  const userBpjs = user?.bpjs_number ?? '';

  const [formData, setFormData] = useState({
    firstName: editClaim ? editClaim.clientName.split(' ')[0] : firstNameDefault,
    lastName: editClaim ? editClaim.clientName.split(' ').slice(1).join(' ') : lastNameDefault,
    provider: editClaim ? editClaim.provider : '',
    type: editClaim ? editClaim.type : '',
    amount: editClaim ? editClaim.amount : 0,
    dateOfService: getTodayStr(),
    dob: userDob, // always auto-fill from profile
    bpjsNumber: editClaim ? (editClaim.bpjsNumber ?? '') : userBpjs,
  });

  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const uploadFilesToClaim = async (claimId: string, filesToUpload: UploadedFile[]) => {
    for (const f of filesToUpload) {
      setFiles(prev => prev.map(pf => pf.id === f.id ? { ...pf, uploading: true } : pf));
      try {
        const form = new FormData();
        form.append('file', f.file);
        await apiClient.post(`/claims/${claimId}/documents`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFiles(prev => prev.map(pf => pf.id === f.id ? { ...pf, uploading: false, uploaded: true } : pf));
      } catch (err: any) {
        setFiles(prev => prev.map(pf => pf.id === f.id ? { ...pf, uploading: false, error: err.response?.data?.message || 'Upload failed' } : pf));
      }
    }
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    if (step === 1) {
      if (!formData.firstName.trim()) errors.push('First Name is required');
      if (!formData.lastName.trim()) errors.push('Last Name is required');
      if (!formData.dob) errors.push('Date of Birth is required');
      if (!formData.bpjsNumber.trim()) errors.push('BPJS Number is required');
    } else if (step === 2) {
      if (!formData.dateOfService) errors.push('Date of Service is required');
      if (!formData.provider.trim()) errors.push('Provider Name is required');
      if (!formData.type.trim()) errors.push('Disease / Condition is required');
      if (!formData.amount || formData.amount <= 0) errors.push('Billed Amount must be greater than 0');
    }
    return errors;
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
        setStepErrors(errors);
        return;
      }
      setStepErrors([]);
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        let claimId: string;
        if (editClaim) {
          await updateClaim(editClaim.id, {
            clientName: `${formData.firstName} ${formData.lastName}`.trim(),
            type: formData.type,
            provider: formData.provider,
            amount: formData.amount,
          });
          claimId = editClaim.id;
        } else {
          const newClaim = await addClaim({
            clientName: `${formData.firstName} ${formData.lastName}`.trim(),
            type: formData.type,
            provider: formData.provider,
            amount: formData.amount,
            bpjsNumber: formData.bpjsNumber,
          });
          claimId = newClaim.id;
        }
        if (files.length > 0) {
          await uploadFilesToClaim(claimId, files);
        }
        navigate('/client');
      } catch (err: any) {
        setSubmitError(err.response?.data?.message || 'Failed to submit claim. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStepErrors([]);
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px] max-w-4xl mx-auto">
      <div className="px-6 md:px-10 py-5 border-b border-slate-100 bg-white/50 z-20 shrink-0">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Resubmission Banner */}
      {editClaim && (editClaim.status === 'Rejected' || editClaim.status === 'Partially Approved') && (
        <div className={`mx-6 md:mx-10 mt-5 rounded-lg p-3.5 flex items-start gap-2.5 text-sm ${
          editClaim.status === 'Rejected'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-slate-100 border border-slate-200 text-slate-700'
        }`}>
          <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
            editClaim.status === 'Rejected' ? 'text-rose-500' : 'text-slate-500'
          }`} />
          <div>
            <p className="font-semibold text-xs mb-0.5">
              {editClaim.status === 'Rejected'
                ? 'Your claim was rejected. Edit and resubmit with corrections.'
                : 'Your claim was partially approved. Edit and resubmit if needed.'}
            </p>
            {editClaim.notes && (
              <p className="text-xs leading-relaxed opacity-90">Analyst notes: {editClaim.notes}</p>
            )}
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 py-10 flex-grow bg-white">
        <div className="max-w-3xl">
          {currentStep === 1 && <PatientInfoStep formData={formData} setFormData={setFormData} isEdit={!!editClaim} />}
          {currentStep === 2 && <ProviderDetailsStep formData={formData} setFormData={setFormData} isEdit={!!editClaim} />}
          {currentStep === 3 && <UploadDocumentsStep isEdit={!!editClaim} files={files} setFiles={setFiles} />}
          {currentStep === 4 && <ReviewStep formData={formData} isEdit={!!editClaim} isResubmit={!!editClaim && (editClaim.status === 'Rejected' || editClaim.status === 'Partially Approved')} filesCount={files.length} />}
        </div>
      </div>
      <div className="px-6 md:px-10 py-5 border-t border-slate-100 bg-white flex flex-col gap-3 shrink-0">
        {stepErrors.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <ul className="list-disc list-inside space-y-1">
              {stepErrors.map((err, i) => (
                <li key={i} className="text-sm text-rose-700">{err}</li>
              ))}
            </ul>
          </div>
        )}
        {submitError && (
          <div className="text-sm text-rose-600 font-medium">
            {submitError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Step {currentStep} of {STEPS.length}
          </div>
          <div className="flex justify-end gap-3 flex-1">
            <Button variant="secondary" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
              Back
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : currentStep === STEPS.length ? (editClaim ? 'Resubmit Claim' : 'Submit Claim') : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}