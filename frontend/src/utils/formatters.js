export function formatArea(value, unit = 'sq ft') {
  const num = Number(value || 0);
  const formatted = Number.isInteger(num) ? num.toLocaleString('en-IN') : num.toFixed(2);
  return `${formatted} ${unit}`;
}

export function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInputValue(dateString) {
  if (!dateString) return '';
  return String(dateString).slice(0, 10);
}

export function getOutputUnitLabel(unit) {
  if (unit === 'SQ_FT') return 'sq ft';
  if (unit === 'RUNNING_FT') return 'rft';
  if (unit === 'PIECES') return 'pcs';
  return 'fixed';
}

