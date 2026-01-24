import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CMB_BASE = import.meta.env.VITE_CMB_BASE || 'https://cmb2.duckdns.org';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentDate);

  // Fetch calendar events from CMB API
  const fetchEvents = async (date) => {
    setLoading(true);
    try {
      // Format period as YYYY-MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const period = `${year}-${month}`;
      
      const url = `${CMB_BASE}/calendar/fetch?period=${period}`;
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.data && response.data.events) {
        // Transform Google Calendar API data to events format
        const calendarEvents = response.data.events.map(event => {
          const isNationalHoliday = event.organizer?.email === 'id.indonesian#holiday@group.v.calendar.google.com';
          const startDate = event.start?.date || event.start_local || event.start_raw;
          
          // Parse date properly - ensure it's treated as local date
          const [year, month, day] = startDate.split('-').map(Number);
          const eventDate = new Date(year, month - 1, day);
          
          return {
            id: event.id,
            title: event.summary || 'Event',
            date: eventDate,
            type: isNationalHoliday ? 'holiday' : 'event',
            description: event.description || event.summary,
            isNationalHoliday: isNationalHoliday,
            location: event.location,
            htmlLink: event.htmlLink,
            creator: event.creator?.displayName,
            start: startDate,
            end: event.end?.date || event.end_local || event.end_raw,
            rawEvent: event
          };
        });
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Set empty array on error to prevent crashes
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const refresh = () => {
    fetchEvents(currentDate);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Check if date has events
  const hasEvent = (date) => {
    if (!date) return false;
    return events.some(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Check if date is a holiday
  const isHoliday = (date) => {
    if (!date) return false;
    return events.some(event => 
      event.isNationalHoliday &&
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Check if date is Sunday
  const isSunday = (date) => {
    if (!date) return false;
    return date.getDay() === 0;
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    const dateEvents = getEventsForDate(date);
    if (dateEvents.length > 0) {
      setExpandedEventId(null); // Reset expanded event
      setShowEventModal(true);
    }
  };

  const toggleEventDetail = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value);
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value);
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <div>
      {loading && (
        <div className="flex justify-center items-center py-4">
          <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      <div className="p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-sm font-medium text-gray-900 hover:text-teal-600 transition flex items-center gap-1"
            >
              {monthYear}
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                aria-label="Bulan sebelumnya"
                className="inline-flex items-center justify-center h-8 w-8 rounded bg-white border text-gray-700 hover:shadow hover:bg-gray-50 transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4l-6 6 6 6" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-2 py-1 rounded bg-teal-600 text-white text-sm hover:brightness-95"
              >
                Hari ini
              </button>
              <button
                onClick={nextMonth}
                aria-label="Bulan berikutnya"
                className="inline-flex items-center justify-center h-8 w-8 rounded bg-white border text-gray-700 hover:shadow hover:bg-gray-50 transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4l6 6-6 6" />
                </svg>
              </button>
              <button
                onClick={refresh}
                title="Segarkan"
                className="ml-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-white border text-sm hover:shadow group transition-colors duration-150 hover:bg-gray-50 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 ease-in-out group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-9-9m0 0v4m0-4h4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Bulan</label>
                <select
                  value={currentDate.getMonth()}
                  onChange={handleMonthChange}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value={0}>Januari</option>
                  <option value={1}>Februari</option>
                  <option value={2}>Maret</option>
                  <option value={3}>April</option>
                  <option value={4}>Mei</option>
                  <option value={5}>Juni</option>
                  <option value={6}>Juli</option>
                  <option value={7}>Agustus</option>
                  <option value={8}>September</option>
                  <option value={9}>Oktober</option>
                  <option value={10}>November</option>
                  <option value={11}>Desember</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Tahun</label>
                <select
                  value={currentDate.getFullYear()}
                  onChange={handleYearChange}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {/* Days */}
          {days.map((date, index) => {
            const hasEvents = hasEvent(date);
            const dateIsHoliday = isHoliday(date);
            const dateIsSunday = isSunday(date);
            const isRedDate = dateIsHoliday || dateIsSunday;
            
            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                disabled={!date}
                className={`
                  relative aspect-square text-sm rounded-lg transition-colors flex flex-col items-center justify-center
                  ${!date ? 'invisible' : ''}
                  ${isToday(date) ? 'bg-teal-600 text-white font-semibold' : ''}
                  ${isSelected(date) && !isToday(date) ? 'bg-teal-100 text-teal-900' : ''}
                  ${!isToday(date) && !isSelected(date) && !isRedDate ? 'hover:bg-gray-100' : ''}
                  ${!isToday(date) && !isSelected(date) && isRedDate ? 'text-rose-600 font-semibold hover:bg-rose-50' : ''}
                  ${hasEvents && !isToday(date) ? 'ring-1 ring-rose-400' : ''}
                `}
              >
                <span>{date && date.getDate()}</span>
                {isToday(date) && (
                  <span className="text-[9px] mt-0.5 opacity-90">Hari ini</span>
                )}
                {hasEvents && !isToday(date) && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-500"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Event list for selected date */}
        {selectedDateEvents.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h5 className="text-xs font-semibold text-gray-700 mb-2">
              {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)}
            </h5>
            <div className="space-y-2">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 p-2 bg-rose-50 rounded-lg border border-rose-100">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    {event.description && event.description !== event.title && (
                      <p className="text-xs text-gray-600">{event.description}</p>
                    )}
                    {event.isNationalHoliday && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 mt-1">
                        Hari Libur Nasional
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && selectedDateEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowEventModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Kegiatan</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  const isExpanded = expandedEventId === event.id;
                  return (
                    <div key={event.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleEventDetail(event.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start gap-3 flex-1 text-left">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              event.isNationalHoliday ? 'bg-rose-100' : 'bg-teal-100'
                            }`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                                event.isNationalHoliday ? 'text-rose-600' : 'text-teal-600'
                              }`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            {event.isNationalHoliday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 mt-1">
                                Hari Libur Nasional
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                          <div className="pt-4 space-y-3">
                            {/* Description */}
                            {event.description && event.description !== event.title && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Deskripsi</p>
                                <p className="text-sm text-gray-700 whitespace-pre-line">{event.description}</p>
                              </div>
                            )}

                            {/* Location */}
                            {event.location && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Lokasi</p>
                                <div className="flex items-start gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  <p className="text-sm text-gray-700">{event.location}</p>
                                </div>
                              </div>
                            )}

                            {/* Creator */}
                            {event.creator && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Dibuat oleh</p>
                                <p className="text-sm text-gray-700">{event.creator}</p>
                              </div>
                            )}

                            {/* Date Range */}
                            {event.start && event.end && event.start !== event.end && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Periode</p>
                                <p className="text-sm text-gray-700">
                                  {event.start} s/d {event.end}
                                </p>
                              </div>
                            )}

                            {/* Link to Google Calendar */}
                            {event.htmlLink && (
                              <div className="pt-2">
                                <a
                                  href={event.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Lihat di Google Calendar
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
