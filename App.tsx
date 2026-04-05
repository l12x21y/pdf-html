import React, { useState, useCallback, FormEvent } from 'react';
import { PaperData } from './types';
import { parsePdf } from './services/pdfParser';
import { restructurePaper } from './services/geminiService';
import Loader from './components/Loader';
import { UploadIcon, FileIcon, DownloadIcon, KeyIcon } from './components/icons';

const generateHtml = (data: PaperData): string => {
  const getHeadingTag = (heading: string): string => {
    const dotCount = (heading.match(/\./g) || []).length;
    
    // For non-numbered headings like "Abstract", "Conclusion"
    if (!/^\d/.test(heading)) {
      return 'h2';
    }

    if (dotCount >= 2) { // e.g. 2.1.1
      return 'h4';
    }
    if (dotCount === 1) { // e.g. 2.1
      return 'h3';
    }
    return 'h2'; // e.g. 2.
  };

  const contentHtml = data.sections.map(section => {
    const HeadingTag = getHeadingTag(section.heading);
    return `
    <div>
      <${HeadingTag}>${section.heading}</${HeadingTag}>
      <div class="prose max-w-none text-slate-700 leading-relaxed">${section.content}</div>
    </div>
  `}).join('');

  const referencesHtml = data.references.map(ref => `<li class="mb-2">${ref}</li>`).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
      <style>
        body { font-family: 'Lora', serif; line-height: 1.6; color: #333; background-color: #fdfdfd; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 2rem auto; padding: 2rem; background-color: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; }
        h1, h2, h3, h4 { font-family: 'Inter', sans-serif; }
        h1 { font-size: 2.5em; text-align: center; margin-bottom: 1rem; color: #1e293b; }
        h2 { font-size: 1.75em; color: #334155; margin-top: 2.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
        h3 { font-size: 1.4em; color: #475569; margin-top: 2rem; margin-bottom: 0.75rem; }
        h4 { font-size: 1.15em; color: #475569; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .abstract { background-color: #f1f5f9; padding: 1.5rem; margin-bottom: 2rem; border-left: 4px solid #3b82f6; border-radius: 4px; }
        .abstract h2 { margin-top: 0; border-bottom: none; padding-bottom: 0; }
        .prose p { margin-bottom: 1em; }
        .references ol { list-style-position: inside; padding-left: 0; }
        img { display: block; margin: 1.5rem auto; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${data.title}</h1>
        <div class="abstract">
          <h2>Abstract</h2>
          <div class="prose max-w-none text-slate-700 leading-relaxed">${data.abstract}</div>
        </div>
        <main>${contentHtml}</main>
        <section class="references">
          <h2>References</h2>
          <ol>${referencesHtml}</ol>
        </section>
      </div>
    </body>
    </html>
  `;
};

const ApiKeyInput: React.FC<{ onSave: (key: string) => void }> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <KeyIcon className="w-12 h-12 text-slate-400 mb-4 mx-auto" />
      <h2 className="text-2xl font-bold text-slate-200 mb-4">Enter Your Gemini API Key</h2>
      <p className="text-slate-400 mb-6">
        To use this application, you need a Google Gemini API key. Get one from{' '}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          Google AI Studio
        </a>.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter your API key here"
          className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Gemini API Key"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Save & Continue
        </button>
      </form>
       <p className="text-xs text-slate-500 mt-4">Your key is stored locally in your browser and is not sent to our servers.</p>
    </div>
  );
};

const FileUpload: React.FC<{ onFileSelect: (file: File) => void; disabled: boolean }> = ({ onFileSelect, disabled }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            if (e.dataTransfer.files[0].type === "application/pdf") {
                onFileSelect(e.dataTransfer.files[0]);
            } else {
                alert("Please upload a PDF file.");
            }
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
             if (e.target.files[0].type === "application/pdf") {
                onFileSelect(e.target.files[0]);
            } else {
                alert("Please upload a PDF file.");
            }
        }
    }

    return (
        <div 
            className={`w-full max-w-2xl mx-auto p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-blue-500 bg-slate-700' : 'border-slate-600 hover:border-blue-400'}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
        >
            <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={disabled} />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center text-center cursor-pointer">
                <UploadIcon className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-200">Drag & drop your paper here</h3>
                <p className="text-slate-400 mt-1">or click to browse</p>
                <p className="text-xs text-slate-500 mt-4">PDF format only</p>
            </label>
        </div>
    );
};

const ResultDisplay: React.FC<{ fileName: string; htmlContent: string; onReset: () => void }> = ({ fileName, htmlContent, onReset }) => {
    const handleDownload = () => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-2xl mx-auto text-center">
             <h2 className="text-2xl font-bold text-blue-400 mb-6">Processing Complete!</h2>
            <div className="bg-slate-800 rounded-lg p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-4 min-w-0">
                    <FileIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                    <span className="text-lg text-slate-300 truncate font-medium">{fileName}</span>
                </div>
                <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 ease-in-out transform hover:scale-105 flex-shrink-0"
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download</span>
                </button>
            </div>
             <button onClick={onReset} className="mt-8 text-slate-400 hover:text-white transition-colors">Process another paper</button>
        </div>
    );
};


function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleApiKeySave = (newKey: string) => {
    localStorage.setItem('gemini_api_key', newKey);
    setApiKey(newKey);
  };

  const handleApiKeyChange = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    handleReset();
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    processFile(selectedFile);
  };
  
  const processFile = useCallback(async (fileToProcess: File) => {
    if (!fileToProcess || !apiKey) return;
    
    setIsLoading(true);
    setError('');
    setGeneratedHtml('');
    setFileName('');

    try {
      setLoadingMessage('Parsing PDF...');
      const { text } = await parsePdf(fileToProcess);

      setLoadingMessage('Analyzing content with AI...');
      const paperData = await restructurePaper(text, apiKey);

      setLoadingMessage('Generating HTML file...');
      const html = generateHtml(paperData);
      
      const safeFileName = paperData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      setGeneratedHtml(html);
      setFileName(`${safeFileName || 'paper'}.html`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [apiKey]);

  const handleReset = () => {
    setFile(null);
    setGeneratedHtml('');
    setFileName('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {isLoading && <Loader message={loadingMessage} />}
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-100">AI Paper Re-formatter</h1>
        <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto">Upload a research paper in PDF, and our AI will reorganize it into a clean, web-friendly HTML file.</p>
      </header>

      <main className="w-full">
        {error && (
            <div className="w-full max-w-2xl mx-auto bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        {!apiKey ? (
          <ApiKeyInput onSave={handleApiKeySave} />
        ) : !generatedHtml ? (
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
        ) : (
            <ResultDisplay fileName={fileName} htmlContent={generatedHtml} onReset={handleReset} />
        )}
      </main>

       <footer className="text-center text-slate-500 mt-12 text-sm">
            <p>Powered by Gemini AI</p>
            {apiKey && (
              <button onClick={handleApiKeyChange} className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Change API Key
              </button>
            )}
        </footer>
    </div>
  );
}

export default App;