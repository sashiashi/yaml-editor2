import React from 'react';
import { Grid2x2, Grid3x3, LayoutGrid } from 'lucide-react';

interface ColumnSwitcherProps {
  value: number;
  onChange: (value: number) => void;
}

export const ColumnSwitcher: React.FC<ColumnSwitcherProps> = ({ value, onChange }) => {
  const options = [
    { columns: 3, icon: Grid2x2, label: '3列' },
    { columns: 4, icon: Grid3x3, label: '4列' },
    { columns: 6, icon: LayoutGrid, label: '6列' },
  ];

  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {options.map(({ columns, icon: Icon, label }) => (
        <button
          key={columns}
          onClick={() => onChange(columns)}
          className={`p-2 rounded-md transition-colors ${
            value === columns
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
          title={label}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
};