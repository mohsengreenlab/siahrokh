import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse the initial value or current value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      
      setSelectedHour(hour12.toString().padStart(2, '0'));
      setSelectedMinute(minutes);
      setSelectedPeriod(period);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Convert 12-hour format to 24-hour format
  const formatTo24Hour = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    let hour24 = parseInt(hour, 10);
    
    if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Format for display (12-hour format)
  const formatForDisplay = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    return `${hour}:${minute} ${period}`;
  };

  const handleTimeSelect = () => {
    const time24 = formatTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    onChange(time24);
    setIsOpen(false);
  };

  const displayValue = value 
    ? (() => {
        const [hours, minutes] = value.split(':');
        const hour24 = parseInt(hours, 10);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const period = hour24 >= 12 ? 'PM' : 'AM';
        return formatForDisplay(hour12.toString().padStart(2, '0'), minutes, period);
      })()
    : '';

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => (i * 5).toString().padStart(2, '0')); // 5-minute intervals

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          value={displayValue}
          placeholder="Select time"
          readOnly
          disabled={disabled}
          className={`pr-10 cursor-pointer ${className}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <Clock className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-chess-card border border-gray-600 rounded-lg shadow-lg">
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              {/* Hour Selection */}
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Hour</label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full bg-chess-dark border border-gray-600 rounded px-2 py-1 text-white text-sm"
                >
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Selection */}
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Minute</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full bg-chess-dark border border-gray-600 rounded px-2 py-1 text-white text-sm"
                >
                  {minutes.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Selection */}
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as 'AM' | 'PM')}
                  className="w-full bg-chess-dark border border-gray-600 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 bg-white hover:bg-gray-200 text-black"
                onClick={handleTimeSelect}
              >
                Select
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}