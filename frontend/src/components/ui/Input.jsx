import { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', label, icon: Icon, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-500" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#111111] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ff5a36] focus:border-[#ff5a36] transition-colors py-2.5 ${Icon ? 'pl-10' : 'px-3'} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
});

Input.displayName = 'Input';
