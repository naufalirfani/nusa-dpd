import { useState, useRef, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function SearchableSelect({ value, onChange, options, placeholder, disabled, name, required, clearable = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value),
    [options, value]
  );
  
  const displayText = selectedOption ? selectedOption.label : '';

  const filteredOptions = useMemo(() => 
    options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [options, searchTerm]
  );

  // Virtual scrolling constants
  const ITEM_HEIGHT = 56; // Height of each option item
  const VISIBLE_ITEMS = 6; // Number of visible items
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
  const BUFFER_SIZE = 3; // Extra items to render above/below

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    filteredOptions.length,
    Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + BUFFER_SIZE
  );
  
  const visibleOptions = filteredOptions.slice(startIndex, endIndex);
  const totalHeight = filteredOptions.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setScrollTop(0); // Reset scroll position when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Reset scroll when search changes or when dropdown opens
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [searchTerm, isOpen]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const handleSelect = (optionValue) => {
    const newValue = optionValue === value ? '' : optionValue;
    onChange({ target: { name, value: newValue } });
    setIsOpen(false);
    setSearchTerm('');
    setScrollTop(0); // Reset scroll position after selection
  };

  const handleToggle = () => {
    if (!disabled) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);
      if (willOpen) {
        setScrollTop(0); // Reset scroll position when opening
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="w-full relative">
      {/* Display Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'
        } ${!displayText && 'text-gray-400'}`}
      >
        <span className="truncate">{displayText || placeholder}</span>
        <div className="flex items-center">
          {value && clearable && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { name, value: '' } });
                setSearchTerm('');
                setScrollTop(0);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ target: { name, value: '' } });
                  setSearchTerm('');
                  setScrollTop(0);
                  setIsOpen(false);
                }
              }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer flex items-center mr-2"
              aria-label="Clear selection"
            >
              <FontAwesomeIcon icon={faTimes} />
            </span>
          )}
          <FontAwesomeIcon icon={faChevronDown} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden" style={{ maxHeight: '400px' }}>
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Options List with Virtual Scrolling */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto"
            style={{ height: `${Math.min(CONTAINER_HEIGHT, totalHeight)}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Tidak ditemukan
              </div>
            ) : (
              <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }}>
                  {visibleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-teal-50 transition-colors ${
                        option.value === value ? 'bg-teal-100 text-teal-700 font-medium' : 'text-gray-700'
                      }`}
                      style={{ height: `${ITEM_HEIGHT}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                    >
                      <div className="font-medium truncate">{option.name || option.label}</div>
                      {option.subtitle && <div className="text-xs text-gray-500 mt-0.5 truncate">{option.subtitle}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      <input
        type="hidden"
        name={name}
        value={value || ''}
        required={required && !value}
      />
    </div>
  );
}
