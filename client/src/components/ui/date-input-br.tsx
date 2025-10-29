import { Calendar } from "lucide-react";

interface DateInputBRProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DateInputBR({
  value,
  onChange,
  label,
  placeholder = "DD/MM/AAAA",
  className = "",
  required = false,
}: DateInputBRProps) {
  
  const formatDateBR = (input: string) => {
    // Remove tudo que não é número
    const numbers = input.replace(/\D/g, "");
    
    // Limita a 8 dígitos (DDMMAAAA)
    const limited = numbers.slice(0, 8);
    
    // Aplica a máscara DD/MM/AAAA
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const convertToISO = (dateBR: string): string => {
    // Converte DD/MM/AAAA para AAAA-MM-DD
    if (dateBR.length === 10) {
      const [day, month, year] = dateBR.split('/');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const convertFromISO = (dateISO: string): string => {
    // Converte AAAA-MM-DD para DD/MM/AAAA
    if (dateISO && dateISO.length === 10) {
      const [year, month, day] = dateISO.split('-');
      return `${day}/${month}/${year}`;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateBR(e.target.value);
    const iso = convertToISO(formatted);
    onChange(iso || formatted);
  };

  const displayValue = value && value.includes('-') ? convertFromISO(value) : value;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          maxLength={10}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

