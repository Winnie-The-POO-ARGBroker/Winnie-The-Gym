export function Card({ className = '', children, ...props }) {
  return (
    <div className={`bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
