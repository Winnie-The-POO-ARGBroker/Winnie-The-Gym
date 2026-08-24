export function Button({ className = '', variant = 'primary', children, ...props }) {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111111] focus:ring-[#ff5a36] disabled:opacity-50 disabled:pointer-events-none px-4 py-2";
  
  const variants = {
    primary: "bg-[#ff5a36] text-white hover:bg-[#ff4520]",
    secondary: "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]",
    outline: "border border-[#3a3a3a] text-white hover:bg-[#2a2a2a]",
    ghost: "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
