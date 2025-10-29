import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

interface DatePickerBRProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DatePickerBR({
  value,
  onChange,
  label,
  placeholder = "DD/MM/AAAA",
  className = "",
  required = false,
}: DatePickerBRProps) {
  
  // Converter string YYYY-MM-DD para Date object (timezone local ao meio-dia)
  const stringToDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length !== 10) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    // Usar timezone local ao meio-dia para evitar mudança de dia
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  // Converter Date object para string YYYY-MM-DD (timezone local)
  const dateToString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDate = stringToDate(value);

  const handleDateChange = (date: Date | null) => {
    onChange(dateToString(date));
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="dd/MM/yyyy"
          placeholderText={placeholder}
          required={required}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          locale="pt-BR"
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

