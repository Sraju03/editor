import React, { ChangeEvent, useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { Button } from "@/components/ui/button";

// Declare pdfjsLib as a global variable
declare global {
  interface Window {
    pdfjsLib: typeof import('pdfjs-dist');
  }
}

interface DocxUploaderProps {
  onDocxLoad: (html: string) => void;
}

export default function DocxUploader({ onDocxLoad }: DocxUploaderProps) {
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  useEffect(() => {
    // Load pdfjs-dist via script tag
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        setPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load pdf.js script');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!['docx', 'pdf'].includes(fileExtension || '')) {
      alert('Please upload a .docx or .pdf file only.');
      e.target.value = ''; // Clear the input
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (ev: ProgressEvent<FileReader>) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer;

        if (fileExtension === 'docx') {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (result.value) {
            onDocxLoad(result.value);
          } else {
            throw new Error('Failed to convert DOCX to HTML');
          }
        } else if (fileExtension === 'pdf') {
          if (!pdfjsLoaded || typeof window === 'undefined' || !window.pdfjsLib) {
            throw new Error('PDF processing library not loaded. Please refresh the page or try again later.');
          }
          const pdfData = new Uint8Array(arrayBuffer);
          const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;
          const numPages = pdf.numPages;
          let pdfText = '';

          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          }

          const htmlContent = `<p>${pdfText.replace(/\n/g, '</p><p>')}</p>`;
          onDocxLoad(htmlContent);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      alert(`Error processing the ${fileExtension} file. ${(error as Error).message || 'Unknown error occurred.'}`);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Word Document (.docx) or PDF (.pdf):</label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".docx,.pdf"
          onChange={handleUpload}
          className="hidden"
          id="docx-upload"
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('docx-upload')?.click()}
          className="text-sm"
        >
          Choose File
        </Button>
        <span className="text-sm text-gray-500">No file selected</span>
      </div>
    </div>
  );
}