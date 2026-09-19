export function getTimeAgo(dateString, now = new Date()) {
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / 60000);
  
  if (diffInMinutes < 1) return 'hace un momento';
  if (diffInMinutes === 1) return 'hace 1 minuto';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minutos`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return 'hace 1 hora';
  if (diffInHours < 24) return `hace ${diffInHours} horas`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'hace 1 día';
  return `hace ${diffInDays} días`;
}
