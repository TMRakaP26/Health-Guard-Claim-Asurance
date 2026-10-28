import React from 'react';
import { BookOpen, CheckCircle, FileText, UploadCloud, FileDigit, User } from 'lucide-react';

export function Guide() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">How to Submit a Claim</h1>
            <p className="text-slate-500 text-sm mt-1">Follow this step-by-step guide to quickly file your claim and get reimbursed.</p>
          </div>
        </div>

        <div className="mt-10 space-y-12">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute top-8 left-[19px] bottom-[-40px] w-0.5 bg-slate-100 hidden sm:block"></div>
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                  1
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex-grow">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Gather Patient Information
                </h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Before starting, make sure you have the correct patient details handy. You will need the patient's full name, date of birth, and contact information. Ensure that your Member ID and Group Number match your insurance card exactly to prevent delays.
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-2 rounded-md border border-slate-200 w-max">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Member ID Ready
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute top-8 left-[19px] bottom-[-40px] w-0.5 bg-slate-100 hidden sm:block"></div>
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                  2
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex-grow">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileDigit className="w-4 h-4 text-slate-500" />
                  Provider & Service Details
                </h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Enter the details about the healthcare provider you visited (e.g., Dr. Smith or City General Hospital). You will also need to provide the date of service, the billed amount, and the Diagnosis Code (ICD-10) which can typically be found on your receipt or superbill.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute top-8 left-[19px] bottom-[-40px] w-0.5 bg-slate-100 hidden sm:block"></div>
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                  3
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex-grow">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  Upload Documents
                </h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  A claim cannot be processed without proper documentation. You must upload a scanned copy or clear photo of your itemized bill. The bill should clearly show the services rendered, their individual costs, and any payments already made.
                </p>
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                  <strong className="font-semibold block mb-1">Accepted File Formats:</strong>
                  We accept PDF, JPG, and PNG files up to 10MB in size. Ensure all text in your images is clearly legible.
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                  4
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex-grow">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-500 rounded-full">!</span>
                  Review & Submit
                </h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Carefully review all the information you have entered. Ensure the billing details match your uploaded documents. Once you are confident everything is correct, click the submit button. You will receive a confirmation number and email shortly after.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-600 rounded-xl p-8 text-center text-white shadow-sm flex flex-col items-center justify-center">
        <FileText className="w-8 h-8 mb-4 text-blue-200" />
        <h2 className="text-xl font-bold mb-2">Ready to submit your claim?</h2>
        <p className="text-blue-100 text-sm mb-6 max-w-md mx-auto">
          Navigate to the Submit Claim tab in the sidebar to start your application. It only takes a few minutes.
        </p>
        <a 
          href="/client/submit" 
          className="bg-white text-blue-600 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-2"
        >
          Start New Claim
        </a>
      </div>
    </div>
  );
}