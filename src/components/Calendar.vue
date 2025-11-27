<template>
  <div>
    <div class="flex justify-end px-4 pb-2">
      <button
        v-if="canAddEvent"
        @click="openAddModal()"
        class="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded bg-teal-600 text-white text-sm hover:brightness-95"
        aria-label="Tambah Kegiatan"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 5v10M5 10h10"
          />
        </svg>
        <span>Tambah Kegiatan</span>
      </button>
    </div>
    <div class="p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-medium text-gray-900">{{ monthYear }}</div>
        <div class="flex items-center gap-2">
          <button
            @click="prevMonth"
            aria-label="Bulan sebelumnya"
            class="inline-flex items-center justify-center h-8 w-8 rounded bg-white border text-gray-700 hover:shadow hover:bg-gray-50 transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4l-6 6 6 6"
              />
            </svg>
          </button>
          <button
            @click="goToToday"
            class="px-2 py-1 rounded bg-teal-600 text-white text-sm hover:brightness-95"
          >
            Hari ini
          </button>
          <button
            @click="nextMonth"
            aria-label="Bulan berikutnya"
            class="inline-flex items-center justify-center h-8 w-8 rounded bg-white border text-gray-700 hover:shadow hover:bg-gray-50 transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 4l6 6-6 6"
              />
            </svg>
          </button>
          <button
            @click="refresh"
            title="Segarkan"
            class="ml-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-white border text-sm hover:shadow group transition-colors duration-150 hover:bg-gray-50 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transform transition-transform duration-200 ease-in-out group-hover:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 11-9-9m0 0v4m0-4h4"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="mb-2 flex items-center gap-2">
        <div
          v-if="isLoading"
          class="text-xs text-gray-500 flex items-center gap-2"
        >
          <svg
            class="animate-spin h-4 w-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span>Memuat jadwal...</span>
        </div>
        <div v-else-if="fetchError" class="text-xs text-rose-600">
          Gagal memuat jadwal
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        <div v-for="d in weekdays" :key="d" class="py-1">{{ d }}</div>
      </div>

      <div class="grid grid-cols-7 gap-1 mt-2">
        <div
          v-for="cell in cells"
          :key="cell.key"
          @click="cell.isCurrentMonth ? selectDate(cell.date) : null"
          @pointerdown="
            cell.isCurrentMonth ? onCellPointerDown($event, cell) : null
          "
          @mouseenter="cell.isCurrentMonth ? onCellEnter(cell, $event) : null"
          @mousemove="cell.isCurrentMonth ? onCellMove($event) : null"
          @mouseleave="onCellLeave"
          :class="[
            'p-2 border rounded-md overflow-hidden bg-white flex flex-col',
            'calendar-cell',
            cell.isCurrentMonth
              ? 'cursor-pointer text-gray-700 hover:shadow-sm'
              : 'bg-gray-200 text-gray-500 cursor-default pointer-events-none opacity-60 grayscale select-none',
          ]"
        >
          <div class="flex-none h-10 flex items-center justify-center">
            <div
              :class="[
                isHoliday(cell.date)
                  ? 'text-rose-700'
                  : isToday(cell.date)
                  ? 'text-teal-700'
                  : 'text-gray-700',
              ]"
              class="text-center"
            >
              <span
                class="inline-flex items-center justify-center w-8 h-8 leading-none text-base align-middle"
                :class="badgeClassForDate(cell.date)"
              >
                {{ cell.date.getDate() }}
              </span>
            </div>
          </div>

          <div
            v-if="eventsFor(cell.date).length"
            class="w-full mt-2 cell-events"
          >
            <ul class="space-y-1 text-left text-[11px]">
              <li
                v-for="(ev, i) in eventsFor(cell.date).slice(0, 2)"
                :key="i"
                :class="[
                  'truncate px-1 rounded text-white',
                  ev.isHoliday ? 'bg-rose-600/90' : 'bg-teal-600/90',
                ]"
              >
                {{ ev.title }}
              </li>
              <li
                v-if="eventsFor(cell.date).length > 2"
                class="text-[11px] text-gray-500"
              >
                +{{ eventsFor(cell.date).length - 2 }} lainnya
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tooltip -->
      <teleport to="body">
        <div
          v-show="tooltipVisible"
          class="calendar-tooltip fixed z-50 pointer-events-none max-w-xs w-auto"
          :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
          role="tooltip"
        >
          <div
            class="tooltip-inner bg-white border rounded-lg shadow-lg p-3 text-[13px] text-gray-800 relative"
          >
            <div v-html="tooltipContent"></div>
          </div>
        </div>
      </teleport>

      <!-- Modal: event details -->
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
        <div
          class="relative z-10 w-full max-w-xl bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <div class="text-sm font-medium text-gray-900">
                Kegiatan - {{ selectedDateLabel }}
              </div>
              <div class="text-xs text-gray-500">{{ selectedDateHuman }}</div>
            </div>
            <button
              @click="closeModal"
              class="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div class="p-4">
            <ul v-if="selectedEvents.length" class="space-y-3">
              <li
                v-for="(ev, i) in selectedEvents"
                :key="i"
                class="p-3 rounded-lg border"
              >
                <div class="flex items-start justify-between">
                  <div class="font-medium text-gray-900">{{ ev.title }}</div>
                  <div
                    v-if="ev.organizerEmail === 'sdm@dpd.go.id'"
                    class="ml-2"
                  >
                    <button
                      @click.stop="deleteEvent(ev)"
                      :disabled="deletingId === ev.id"
                      class="text-xs px-2 py-1 rounded bg-rose-600 text-white hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg
                        v-if="deletingId === ev.id"
                        class="animate-spin h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="2"
                        ></circle>
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                      <span v-if="deletingId !== ev.id">Hapus</span>
                      <span v-else class="sr-only">Menghapus...</span>
                    </button>
                  </div>
                </div>
                <div
                  v-if="ev.startTime || ev.endTime"
                  class="mt-1 text-md text-gray-500 flex items-start gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 mt-0.5 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3"
                    />
                  </svg>
                  <div>
                    <span v-if="ev.startTime">{{ ev.startTime }}</span>
                    <span v-if="ev.startTime && ev.endTime"> - </span>
                    <span v-if="ev.endTime">{{ ev.endTime }}</span>
                    <span v-if="ev.timeZone" class="ml-2 font-medium">{{
                      ev.timeZone
                    }}</span>
                  </div>
                </div>
                <div
                  v-if="ev.location"
                  class="text-md text-gray-500 flex items-start gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
                    />
                  </svg>
                  <div class="flex-1 flex items-start gap-2">
                    <div
                      v-if="isUrl(ev.location)"
                      class="flex-1 min-w-0"
                      :title="ev.location"
                    >
                      <a
                        :href="ev.location"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-teal-600 hover:text-teal-700 underline break-all whitespace-normal max-w-full"
                        @click.stop
                      >
                        {{ ev.location }}
                      </a>
                    </div>
                    <div
                      v-else
                      class="truncate flex-1 min-w-0 overflow-hidden"
                      :title="ev.location"
                    >
                      <span class="truncate-ellipsis">{{ ev.location }}</span>
                    </div>
                  </div>
                </div>
                <div
                  v-if="ev.desc"
                  class="mt-2 text-sm text-gray-600"
                  v-html="ev.desc"
                ></div>
              </li>
            </ul>
            <div v-else class="text-sm text-gray-500">
              Tidak ada kegiatan pada tanggal ini.
            </div>
          </div>
          <div class="px-4 py-3 border-t text-right">
            <button
              @click="closeModal"
              class="px-3 py-1 rounded bg-teal-600 text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      <!-- Add Event Modal -->
      <EventModal
        v-if="showAddModal"
        :initial-date="initialDateForAdd"
        @close="showAddModal = false"
        @added="onEventAdded"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import axios from "axios";
import EventModal from "./EventModal.vue";

const today = new Date();
const viewDate = ref(new Date(today.getFullYear(), today.getMonth(), 1));

const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Events fetched from backend
const eventsRef = ref([]);
const isLoading = ref(false);
const fetchError = ref(null);

// Load user profile from localStorage to determine permission to add events
const userProfileRef = ref(null);
const allowedUnorNames = [
  "subbagian pengembangan kapasitas sumber daya manusia",
  "subbagian fasilitasi jabatan fungsional",
  "subbagian kerja sama",
  "bagian pengembangan sumber daya manusia",
];

const canAddEvent = computed(() => {
  try {
    const p = userProfileRef.value || {};
    const raw = p.unorNama || p.unor_nama || p.unor || "";
    const normalized = String(raw).trim().toLowerCase();
    return allowedUnorNames.includes(normalized);
  } catch (e) {
    return false;
  }
});

// Simple per-month cache in localStorage to reduce requests
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
function cacheKeyFor(y, m) {
  return `calendar_events_${y}_${m}`;
}
function loadCache(y, m) {
  try {
    const raw = localStorage.getItem(cacheKeyFor(y, m));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.items) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch (e) {
    return null;
  }
}
function saveCache(y, m, items) {
  try {
    localStorage.setItem(
      cacheKeyFor(y, m),
      JSON.stringify({ ts: Date.now(), items })
    );
  } catch (e) {}
}

// Holiday cache (daily)
const holidayDatesRef = ref(new Set());
const HOLIDAY_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
function holidayCacheKeyFor(y, m) {
  return `holiday_dates_${y}_${m}`;
}
function loadHolidayCache(y, m) {
  try {
    const raw = localStorage.getItem(holidayCacheKeyFor(y, m));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.items) return null;
    if (Date.now() - parsed.ts > HOLIDAY_CACHE_TTL_MS) return null;
    return parsed.items;
  } catch (e) {
    return null;
  }
}
function saveHolidayCache(y, m, items) {
  try {
    localStorage.setItem(
      holidayCacheKeyFor(y, m),
      JSON.stringify({ ts: Date.now(), items })
    );
  } catch (e) {}
}

async function fetchHolidaysForView(force = false) {
  try {
    const y = viewDate.value.getFullYear();
    const m = viewDate.value.getMonth() + 1;
    if (!force) {
      const cached = loadHolidayCache(y, m);
      if (cached) {
        holidayDatesRef.value = new Set(cached.map((d) => String(d)));
        return;
      }
    }

    const url = `/dayoffapi?month=${m}&year=${y}`;
    const resp = await axios.get(url);
    const data = resp && resp.data ? resp.data : null;

    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.data)) items = data.data;
    else if (data && Array.isArray(data.items)) items = data.items;
    else if (data && typeof data === "object") {
      // maybe object with date keys
      const keys = Object.keys(data || {});
      keys.forEach((k) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && data[k]) items.push({ date: k });
      });
    }

    const parsedDates = [];
    items.forEach((it) => {
      const ds =
        it.date ||
        it.tanggal ||
        it.day ||
        it.day_string ||
        it.dayDate ||
        it.day_date ||
        it.dayName ||
        null;
      if (ds) {
        try {
          const d = new Date(ds);
          if (!isNaN(d)) parsedDates.push(formatKey(d));
        } catch (e) {}
      } else if (typeof it === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it)) {
        parsedDates.push(it);
      }
    });

    // Fallback: also mark Sundays by scanning the month
    // (we still store only dates returned by API; Sundays are handled in isHoliday)

    holidayDatesRef.value = new Set(parsedDates);
    try {
      saveHolidayCache(y, m, parsedDates);
    } catch (e) {}
  } catch (err) {
    console.warn("Failed to fetch holiday data", err);
  }
}

// Load profile from localStorage (non-blocking)
function loadLocalUserProfile() {
  try {
    const raw = localStorage.getItem("userProfile");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed) userProfileRef.value = parsed;
  } catch (e) {
    // ignore
  }
}

// Normalize server events into { id?, date: 'YYYY-MM-DD', title, time?, desc?, isHoliday }
function normalizeServerEvent(e) {
  let dateStr = null;
  // Many event shapes: e.date, e.start (string), e.start.date, e.start.dateTime
  if (e.date) dateStr = e.date;
  else if (e.start) {
    if (typeof e.start === "string") {
      try {
        dateStr = formatKey(new Date(e.start));
      } catch (err) {
        dateStr = null;
      }
    } else if (e.start.date) {
      dateStr = String(e.start.date);
    } else if (e.start.dateTime) {
      try {
        dateStr = formatKey(new Date(e.start.dateTime));
      } catch (err) {
        dateStr = null;
      }
    }
  } else if (e.startDate) dateStr = e.startDate;

  const title = e.summary || e.title || e.name || "Tanpa judul";
  let time = e.time || null;
  if (!time && e.start) {
    try {
      const dt =
        typeof e.start === "string"
          ? new Date(e.start)
          : e.start && e.start.dateTime
          ? new Date(e.start.dateTime)
          : null;
      if (dt && !isNaN(dt))
        time = dt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    } catch (err) {
      time = null;
    }
  }

  // Detect holiday by server flag, organizer/creator email, or keywords in title/summary
  const titleLower = String(title).toLowerCase();
  const holidayKeywords =
    /\blibur\b|hari libur|\bcuti\b|nasional|national|idul|lebaran|nyepi|tahun baru|kemerdekaan|hari raya|liburan/i;
  const creatorEmail =
    e.creator && e.creator.email ? String(e.creator.email).toLowerCase() : "";
  const organizerEmail =
    e.organizer && e.organizer.email
      ? String(e.organizer.email).toLowerCase()
      : "";
  const isHoliday =
    e.holiday === true ||
    e.type === "holiday" ||
    holidayKeywords.test(titleLower) ||
    /holiday|libur/.test(creatorEmail) ||
    /holiday|libur/.test(organizerEmail);

  // parse start/end times (if present) and timezone label
  const startObj = e.start || {};
  const endObj = e.end || {};
  let startTimeStr = null;
  let endTimeStr = null;
  let tzLabel = null;
  try {
    if (startObj.dateTime) {
      const sd = new Date(startObj.dateTime);
      if (!isNaN(sd))
        startTimeStr = sd.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      // derive tz label from offset if not provided
      if (startObj.timeZone) tzLabel = startObj.timeZone;
      else if (!tzLabel && sd && !isNaN(sd))
        tzLabel = mapOffsetToIndoLabel(-sd.getTimezoneOffset() / 60);
    } else if (startObj.date) {
      startTimeStr = null; // all-day
      if (startObj.timeZone) tzLabel = startObj.timeZone;
    }
    if (endObj.dateTime) {
      const ed = new Date(endObj.dateTime);
      if (!isNaN(ed))
        endTimeStr = ed.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      if (!tzLabel) {
        if (endObj.timeZone) tzLabel = endObj.timeZone;
        else if (ed && !isNaN(ed))
          tzLabel = mapOffsetToIndoLabel(-ed.getTimezoneOffset() / 60);
      }
    } else if (endObj.date) {
      // all-day
      endTimeStr = null;
      if (!tzLabel && endObj.timeZone) tzLabel = endObj.timeZone;
    }
  } catch (err) {
    // ignore
  }

  // try to extract a location from common fields
  let location = null;
  try {
    if (e.location) {
      location =
        typeof e.location === "string"
          ? e.location
          : e.location.name ||
            e.location.displayName ||
            e.location.address ||
            null;
    } else if (e.locationName) location = String(e.locationName);
    else if (e.place)
      location =
        typeof e.place === "string"
          ? e.place
          : e.place.name || e.place.address || null;
    else if (e.venue) location = String(e.venue);
    else if (e.address) location = String(e.address);
  } catch (e) {
    location = null;
  }

  // normalize tzLabel to short form if possible (WIB/WITA/WIT) or keep original
  const shortTz = mapToShortIndoTz(tzLabel);

  return {
    id: e.id,
    date: dateStr,
    title,
    time: time || startTimeStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    timeZone: shortTz,
    location: location || "",
    desc: e.description || e.desc || "",
    isHoliday,
    organizerEmail,
    creatorEmail,
  };
}

function mapOffsetToIndoLabel(offset) {
  // offset in hours (e.g., 7, 8, 9)
  if (offset === 7) return "WIB";
  if (offset === 8) return "WITA";
  if (offset === 9) return "WIT";
  if (typeof offset === "number" && !isNaN(offset))
    return `UTC${offset >= 0 ? "+" + offset : offset}`;
  return null;
}

function mapToShortIndoTz(tz) {
  if (!tz) return "";
  const s = String(tz).toLowerCase();
  if (s.includes("jakarta") || s.includes("wib") || s.includes("asia/jakarta"))
    return "WIB";
  if (
    s.includes("makassar") ||
    s.includes("wita") ||
    s.includes("asia/makassar") ||
    s.includes("asia/denpasar")
  )
    return "WITA";
  if (
    s.includes("jayapura") ||
    s.includes("wit") ||
    s.includes("asia/jayapura")
  )
    return "WIT";
  // if tz looks like UTC±, return as-is
  if (/utc|gmt|\+\d|\-\d/.test(s)) return tz;
  return tz;
}

function isHoliday(d) {
  // Sunday is holiday
  if (d.getDay() === 0) return true;
  const key = formatKey(d);
  if (holidayDatesRef.value && holidayDatesRef.value.has(key)) return true;
  return eventsFor(d).some((ev) => ev.isHoliday);
}

function badgeClassForDate(d) {
  if (isHoliday(d)) return "ring-2 ring-rose-200 rounded-full bg-rose-50";
  if (isToday(d)) return "ring-2 ring-teal-200 rounded-full bg-teal-50";
  return "";
}

const eventsByDate = computed(() => {
  const map = {};
  eventsRef.value.forEach((ev) => {
    if (!ev.date) return;
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  });
  return map;
});

function eventsFor(d) {
  return eventsByDate.value[formatKey(d)] || [];
}

const monthYear = computed(() => {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(viewDate.value);
});

function startGridDate(vd) {
  const first = new Date(vd.getFullYear(), vd.getMonth(), 1);
  const dow = first.getDay(); // 0..6
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

const cells = computed(() => {
  const start = startGridDate(viewDate.value);
  const out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({
      key: formatKey(d),
      date: d,
      isCurrentMonth: d.getMonth() === viewDate.value.getMonth(),
    });
  }
  return out;
});

function isToday(d) {
  return formatKey(d) === formatKey(today);
}

function prevMonth() {
  viewDate.value = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth() - 1,
    1
  );
}

function nextMonth() {
  viewDate.value = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth() + 1,
    1
  );
}

function goToToday() {
  viewDate.value = new Date(today.getFullYear(), today.getMonth(), 1);
}

// Fetch events from backend endpoint `/cmb/calendar` for the current view month
// Implementation is provided in the enhanced `fetchEventsForView(force = false)` below.
async function fetchEventsForView(force = false) {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const y = viewDate.value.getFullYear();
    const m = viewDate.value.getMonth() + 1; // 1-based month for API

    // Use cache when available (unless force)
    if (!force) {
      const cached = loadCache(y, m);
      if (cached) {
        eventsRef.value = cached
          .map(normalizeServerEvent)
          .filter((e) => !!e.date);
        isLoading.value = false;
        return;
      }
    }

    const token = localStorage.getItem("token") || "";
    const apiToken = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";

    const url = `/cmb/calendar/fetch?period=${y}-${m}`;
    const headers = {};
    if (apiToken) {
      // encrypt token for header using shared helper (falls back to raw)
      try {
        const { encryptTokenForHeader } = await import("../utils/crypto");
        headers["X-Api-Token"] = await encryptTokenForHeader(apiToken, {
          salt: apiToken,
        });
      } catch (e) {
        headers["X-Api-Token"] = apiToken;
      }
    }
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await axios.get(url, { headers });
    const data = resp && resp.data ? resp.data : [];

    // If backend tells us Google token is missing for the user, ask and redirect to Google connect
    if (
      data &&
      typeof data === "object" &&
      data.error &&
      String(data.error).toLowerCase().includes("google token not found")
    ) {
      try {
        const proceed =
          typeof Swal !== "undefined"
            ? await Swal.fire({
                title: "Akun Google belum terhubung",
                text: "Anda akan diarahkan untuk menghubungkan akun Google.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Buka koneksi",
                cancelButtonText: "Batal",
              }).then((r) => r.isConfirmed)
            : confirm("Akun Google belum terhubung. Buka halaman koneksi?");
        if (proceed) {
          const base = (import.meta.env.VITE_CMB_BASE || "").replace(/\/$/, "");
          const authUrl = base ? `${base}/auth/google` : "/auth/google";
          window.open(authUrl, "_blank", "noopener,noreferrer");
        }
      } catch (e) {
        console.warn("Failed to open Google auth tab", e);
      }
      eventsRef.value = [];
      isLoading.value = false;
      return;
    }

    // Response might be array or wrapped as { events: [...] } or { items: [...] }
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.events)
      ? data.events
      : Array.isArray(data.items)
      ? data.items
      : [];
    // Save raw list to cache for this month
    try {
      saveCache(y, m, list);
    } catch (e) {}
    eventsRef.value = list.map(normalizeServerEvent).filter((e) => !!e.date);
  } catch (err) {
    console.error("Failed to fetch calendar events", err);
    fetchError.value = err;
    eventsRef.value = [];
  } finally {
    isLoading.value = false;
  }
}
function refresh() {
  fetchHolidaysForView(true);
  fetchEventsForView(true);
}

onMounted(() => {
  // load profile from localStorage so we can determine permission
  loadLocalUserProfile();
  fetchHolidaysForView();
  fetchEventsForView();
});

watch(viewDate, () => {
  fetchHolidaysForView();
  fetchEventsForView();
});

// Tooltip state & handlers
const tooltipVisible = ref(false);
const tooltipContent = ref("");
const tooltipX = ref(0);
const tooltipY = ref(0);
const TOOLTIP_OFFSET_X = 12;
const TOOLTIP_OFFSET_Y = 12;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

function buildTooltipContentFor(date) {
  const human = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const evs = eventsFor(date);
  let html = `<div class="font-medium mb-1 text-[13px]">${escapeHtml(
    human
  )}</div>`;
  if (evs && evs.length) {
    html += '<ul class="space-y-1">';
    evs.slice(0, 3).forEach((ev) => {
      const timeText = ev.startTime
        ? `${escapeHtml(ev.startTime)}${
            ev.endTime ? " - " + escapeHtml(ev.endTime) : ""
          }`
        : "";
      const tzText = ev.timeZone ? `${escapeHtml(ev.timeZone)}` : "";
      const badge = ev.isHoliday ? '<span class="text-rose-600">●</span> ' : "";
      html += `<li class="pb-1">
        <div class="font-medium text-[13px]">${badge} ${escapeHtml(
        ev.title
      )}</div>
        <div class="text-gray-500 text-[12px] mt-0.5">${
          timeText ? escapeHtml(timeText) : ""
        }${timeText && tzText ? " " : ""}${
        tzText ? "(" + escapeHtml(tzText) + ")" : ""
      }</div>
      </li>`;
    });
    if (evs.length > 3)
      html += `<li class="text-gray-500">+${evs.length - 3} lainnya</li>`;
    html += "</ul>";
  } else {
    html += '<div class="text-gray-500">Tidak ada kegiatan</div>';
  }
  return html;
}

function onCellEnter(cell, evt) {
  tooltipContent.value = buildTooltipContentFor(cell.date);
  tooltipVisible.value = true;
  onCellMove(evt);
}

function onCellMove(evt) {
  if (!evt || typeof window === "undefined") return;
  const x = evt.clientX + TOOLTIP_OFFSET_X;
  const y = evt.clientY + TOOLTIP_OFFSET_Y;
  const approxWidth = 260;
  const approxHeight = 120;
  const maxX = Math.max(8, window.innerWidth - approxWidth - 8);
  const maxY = Math.max(8, window.innerHeight - approxHeight - 8);
  tooltipX.value = Math.min(x, maxX);
  tooltipY.value = Math.min(y, maxY);
}

function onCellLeave() {
  tooltipVisible.value = false;
}

// Touch / pointer support: show tooltip on touch and auto-hide
const hideTimeout = ref(null);
function clearHideTimeout() {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
}

function onCellPointerDown(evt, cell) {
  try {
    const pType =
      evt && evt.pointerType
        ? evt.pointerType
        : evt.type === "touchstart"
        ? "touch"
        : "mouse";
    if (pType !== "touch") return;
    // prevent the subsequent click/select on touch — treat as tap-to-show
    if (evt.cancelable) evt.preventDefault();
    if (evt.stopPropagation) evt.stopPropagation();

    tooltipContent.value = buildTooltipContentFor(cell.date);
    tooltipVisible.value = true;
    onCellMove(evt);

    clearHideTimeout();
    hideTimeout.value = setTimeout(() => {
      tooltipVisible.value = false;
      hideTimeout.value = null;
    }, 4000);
  } catch (e) {
    // ignore
  }
}

onUnmounted(() => {
  clearHideTimeout();
});

// --- Per-row event height syncing (Option B) ---
function debounce(fn, wait = 120) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      fn(...args);
      t = null;
    }, wait);
  };
}

function syncRowEventHeights() {
  nextTick(() => {
    const cells = Array.from(document.querySelectorAll(".calendar-cell"));
    if (!cells.length) return;
    const cols = 7;
    const rows = Math.ceil(cells.length / cols);
    for (let r = 0; r < rows; r++) {
      const rowCells = cells.slice(r * cols, r * cols + cols);
      let maxH = 0;
      rowCells.forEach((c) => {
        const ev = c.querySelector(".cell-events");
        if (!ev) return;
        // reset to auto so we measure natural content height
        ev.style.height = "auto";
        const h = ev.offsetHeight;
        if (h > maxH) maxH = h;
      });
      // apply measured height to all in the row (or clear if zero)
      rowCells.forEach((c) => {
        const ev = c.querySelector(".cell-events");
        if (!ev) return;
        ev.style.height = maxH ? maxH + "px" : "";
      });
    }
  });
}

const debouncedSync = debounce(syncRowEventHeights, 100);

onMounted(() => {
  window.addEventListener("resize", debouncedSync);
  // initial sync (in case events already loaded)
  debouncedSync();
});

onUnmounted(() => {
  window.removeEventListener("resize", debouncedSync);
});

// Re-sync whenever events change or viewDate changes
watch(eventsRef, () => debouncedSync());
watch(viewDate, () => debouncedSync());

// Modal / selection state
const showModal = ref(false);
const selectedDate = ref(null);
// Delete button loading state
const deletingId = ref(null);
// Add-event modal state
const showAddModal = ref(false);
const initialDateForAdd = ref(null);

function openAddModal(date = null) {
  // double-check permission before opening
  if (!canAddEvent.value) {
    const msg = "Anda tidak memiliki izin untuk menambah kegiatan.";
    if (typeof Swal !== "undefined") Swal.fire({ icon: "warning", title: "Izin ditolak", text: msg });
    else alert(msg);
    return;
  }
  initialDateForAdd.value = date ? new Date(date) : new Date();
  showAddModal.value = true;
}

function onEventAdded(payload) {
  // refresh events after successful add
  try {
    fetchEventsForView(true);
  } catch (e) {
    /* ignore */
  }
}

const selectedEvents = computed(() => {
  if (!selectedDate.value) return [];
  return eventsFor(selectedDate.value);
});

const selectedDateLabel = computed(() => {
  return selectedDate.value ? formatKey(selectedDate.value) : "";
});

const selectedDateHuman = computed(() => {
  return selectedDate.value
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate.value)
    : "";
});

function selectDate(d) {
  selectedDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedDate.value = null;
}

function openMaps(location) {
  try {
    if (!location) return;
    const q = encodeURIComponent(location);
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.warn("Failed to open maps", e);
  }
}

// Delete event (only shown when organizer.email === 'sdm@dpd.go.id')
async function deleteEvent(ev) {
  try {
    if (!ev || !ev.id) return;
    // mark deleting id to show loading state
    deletingId.value = ev.id;
    const proceed =
      typeof Swal !== "undefined"
        ? await Swal.fire({
            title: "Hapus kegiatan?",
            text: `Hapus kegiatan \"${ev.title}\"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal",
            reverseButtons: true,
          }).then((r) => r.isConfirmed)
        : confirm(`Hapus kegiatan "${ev.title}"?`);

    if (!proceed) return;

    const token = localStorage.getItem("token") || "";
    const apiToken = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";

    const headers = {};
    if (apiToken) {
      try {
        const { encryptTokenForHeader } = await import("../utils/crypto");
        headers["X-Api-Token"] = await encryptTokenForHeader(apiToken, {
          salt: apiToken,
        });
      } catch (e) {
        headers["X-Api-Token"] = apiToken;
      }
    }
    if (token) headers["Authorization"] = `Bearer ${token}`;

    await axios.delete(`/cmb/calendar/event/${ev.id}`, { headers });

    if (typeof Swal !== "undefined") {
      try {
        await Swal.fire({
          title: "Berhasil",
          text: "Kegiatan berhasil dihapus.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (e) {}
    }

    // close modal immediately after successful delete
    closeModal();

    // refresh events for the view
    await fetchEventsForView(true);
  } catch (err) {
    console.error("Failed to delete event", err);
    if (typeof Swal !== "undefined") {
      try {
        await Swal.fire({
          title: "Gagal",
          text: "Gagal menghapus kegiatan.",
          icon: "error",
        });
      } catch (e) {}
    } else {
      alert("Gagal menghapus kegiatan.");
    }
  } finally {
    // clear deleting state
    deletingId.value = null;
  }
}

function isUrl(s) {
  try {
    if (!s) return false;
    return /^https?:\/\//i.test(String(s).trim());
  } catch (e) {
    return false;
  }
}
</script>

<style scoped>
/* small tweaks */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Force ellipsis for long unbroken strings (anchors / spans) inside flex */
.truncate-ellipsis {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tooltip styles */
.calendar-tooltip {
  transform-origin: top left;
}
.calendar-tooltip .tooltip-inner::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  left: 12px;
  top: -6px;
  transform: rotate(45deg);
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: -2px -2px 6px rgba(0, 0, 0, 0.03);
}

@media (max-width: 640px) {
  .calendar-tooltip {
    max-width: 85vw;
  }
}
</style>
