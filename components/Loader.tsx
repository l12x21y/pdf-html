
import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 backdrop-blur-sm flex flex-col justify-center items-center z-50">
      <div className="w-16 h-16 border-4 border-slate-400 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-slate-300">{message}</p>
    </div>
  );
};

export default Loader;
