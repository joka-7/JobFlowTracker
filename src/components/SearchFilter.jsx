import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchFilter({
  onSearch,
  onFilterChange,
  placeholder = 'Search...',
  filterOptions = [],
  mode = 'jobseeker'
}) {
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  const handleSearch = (text) => {
    setSearchText(text);
    onSearch?.(text);
  };

  const handleFilterToggle = (filter) => {
    const updated = activeFilters.includes(filter)
      ? activeFilters.filter(f => f !== filter)
      : [...activeFilters, filter];
    setActiveFilters(updated);
    onFilterChange?.(updated);
  };

  const handleClear = () => {
    setSearchText('');
    setActiveFilters([]);
    onSearch?.('');
    onFilterChange?.([]);
  };

  const hasActiveFilters = searchText.length > 0 || activeFilters.length > 0;

  // Define filter options per mode
  const defaultFilters = mode === 'jobseeker'
    ? [
        { id: 'applied', label: 'Applied' },
        { id: 'interviewing', label: 'Interviewing' },
        { id: 'rejected', label: 'Rejected' },
        { id: 'offer', label: 'Offer' },
      ]
    : mode === 'recruiter'
    ? [
        { id: 'sourced', label: 'Sourced' },
        { id: 'interviewing', label: 'Interviewing' },
        { id: 'offer', label: 'Offer' },
        { id: 'rejected', label: 'Rejected' },
      ]
    : [
        { id: 'active', label: 'Active' },
        { id: 'completed', label: 'Completed' },
        { id: 'on_hold', label: 'On Hold' },
      ];

  const filters = filterOptions.length > 0 ? filterOptions : defaultFilters;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3 text-gray-400" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            title="Clear search and filters"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => handleFilterToggle(filter.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilters.includes(filter.id)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
