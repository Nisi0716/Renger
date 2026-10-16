// ==========================================
// 1. DICTIONNAIRE D'ICÔNES VECTORIELLES SVG & INFOBULLES
// ==========================================
const RengerIcons = {
    car: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 17H3v-4l2-5h10l2 5v4h-2m-8 0h4"/></svg>',
    trailer: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8.5h13v5.5H3V8.5zM7.5 8.5v5.5M12 8.5v5.5M16 13.5h3.5l2 1.5M18.5 13.5v3.5"/><circle cx="12" cy="17" r="3" stroke-width="2"/><circle cx="21.5" cy="15" r="0.75" fill="currentColor"/></svg>',
    pro: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 18h18M4 14l3-7 5 5 5-5 3 7H4z"/></svg>',
    crown: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 18h18M4 14l3-7 5 5 5-5 3 7H4z"/></svg>',
    boost: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    rocket: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    calendar: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>',
    clipboard: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>',
    chat: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
    contract: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    doc: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    lock: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    unlock: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 019.9-1"/></svg>',
    shield: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    pin: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3" stroke-width="2"/></svg>',
    settings: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>',
    gear: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>',
    stats: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
    chart: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
    camera: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4" stroke-width="2"/></svg>',
    warning: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    check: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    search: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35"/></svg>',
    card: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke-width="2"/><line x1="2" y1="10" x2="22" y2="10" stroke-width="2"/></svg>',
    payment: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke-width="2"/><line x1="2" y1="10" x2="22" y2="10" stroke-width="2"/></svg>',
    bulb: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>',
    scale: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3-1m0 0l.886 1.771M12 3v18m0-18l3 1m-3-1l-3 1m6 0l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M18 7l3-1m-3 1l.886 1.771"/></svg>',
    plug: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10a2 2 0 012 2v2a5 5 0 01-5 5h-4a5 5 0 01-5-5v-2a2 2 0 012-2z"/></svg>',
    horse: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.5 14.5c0-1.5 1-2.5 2-3.5L8 8l1-4.5c.3-.8 1.4-.8 1.7 0l1 3 1.5-1.5c.5-.5 1.4-.2 1.5.5l.3 2c2 3 3 6.5 3 12M3.5 14.5c.5.8 1.8 1 2.5.2l2-2.2c1-.5 2.5.5 2.5 2.5v5M8.5 8.5a1 1 0 100-.01"/></svg>',
    moto: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="5.5" cy="16.5" r="3.5" stroke-width="2"/><circle cx="5.5" cy="16.5" r="1.5" stroke-width="1.5"/><circle cx="18.5" cy="16.5" r="3.5" stroke-width="2"/><circle cx="18.5" cy="16.5" r="1.5" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 16.5L15 7h-2.5l-2 3H6l-2 3.5h5l2.5 3h4M13.5 5h3.5M6.5 13.5h5"/></svg>',
    snow: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5M16 4l-4 4-4-4M8 20l4-4 4 4M20 16l-4-4 4-4M4 8l4 4-4 4"/></svg>',
    bike: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5" stroke-width="2"/><circle cx="18.5" cy="17.5" r="3.5" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.5 17.5L9 9l3 8.5H5.5M9 9h6l-3 8.5m3-8.5l3.5 8.5M15 9V6h2.5M7.5 9h3"/></svg>',
    luggage: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3M9 20v2m6-2v2"/></svg>',
    swiss: '<svg class="w-4 h-4 inline-block rounded-sm overflow-hidden flex-shrink-0" viewBox="0 0 32 32"><rect width="32" height="32" fill="#D52B1E"/><path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7V6z" fill="#FFF"/></svg>',
    clock: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>',
    hourglass: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>',
    sparkles: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"/></svg>',
    magic: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"/></svg>',
    book: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
    user: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    info: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01"/></svg>',
    plus: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>',
    edit: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
    trash: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
    delivery: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" stroke-width="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke-width="2"/><circle cx="5.5" cy="18.5" r="2.5" stroke-width="2"/><circle cx="18.5" cy="18.5" r="2.5" stroke-width="2"/></svg>',
    straps: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>',
    tarp: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18M3 10h18M5 6l7-3 7 3v15H5V6z"/></svg>',
    winch: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v6m-3-3h6"/></svg>',
    ramps: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l18-8v8H3z"/></svg>',
    trolley: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
    map: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="18" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="22" stroke-width="2"/></svg>',
    key: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
    refresh: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
    flag: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>',
    eye: '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>'
};

function getRengerIcon(name, customClass = '') {
    const raw = RengerIcons[name] || '';
    if (!raw || !customClass) return raw;
    return raw.replace(/class="[^"]*"/, `class="${customClass}"`);
}

// ==========================================
// DICTIONNAIRE CANONIQUE DES INFOBULLES RENGER
// ==========================================
const RengerTooltipDictionary = {
    'caution-non-debitee': "Caution non débitée : simple empreinte bancaire Stripe sécurisée. Aucun prélèvement immédiat n'est effectué sur votre carte bancaire.",
    'permis-b-be': "Permis B vs BE : le permis B voiture standard suffit pour les remorques ≤ 750 kg ou ensembles ≤ 3'500 kg. Au-delà, le permis BE est requis.",
    'ptac': "PTAC (Poids Total Autorisé en Charge) : poids maximum légal cumulé de la remorque et de sa charge utile selon la législation routière suisse.",
    'renger-pro': "Abonnement Renger PRO : conservez 100% de vos revenus locatifs (0% de commission plateforme), remorques illimitées et accès au cockpit Renger Analytics PRO.",
    'boosts': "Boost d'annonce : propulsez votre remorque en tête de liste et sur la carte interactive pendant le week-end ou 7 jours pour maximiser vos réservations.",
    'etat-lieux-certifie': "État des lieux photo certifié (CO art. 257a) : 4 photos obligatoires avec horodatage suisse et coordonnées GPS infalsifiables protégeant locataire et propriétaire.",
    'stripe-connect': "Virements Stripe Connect : vos gains nets de location sont transférés automatiquement et de façon sécurisée vers votre compte bancaire suisse.",
    'blocage-dates': "Blocage de dates : réservez facilement votre remorque pour votre usage personnel ou pour sa maintenance sans frais."
};

// ==========================================
// SYSTÈME UNIVERSEL D'INFOBULLES PÉDAGOGIQUES ("i")
// ==========================================
let globalTooltipEl = null;
let activeTooltipTrigger = null;

function getOrCreateTooltipElement() {
    if (globalTooltipEl) return globalTooltipEl;
    if (typeof document === 'undefined') return null;
    globalTooltipEl = document.createElement('div');
    globalTooltipEl.id = 'renger-global-tooltip';
    globalTooltipEl.className = 'renger-tooltip-bubble bg-stone-900/95 text-white border border-stone-700 shadow-xl rounded-xl p-3 text-xs max-w-xs z-[10000]';
    globalTooltipEl.setAttribute('role', 'tooltip');
    globalTooltipEl.innerHTML = `
        <div id="renger-tooltip-text"></div>
        <div id="renger-tooltip-arrow" class="renger-tooltip-arrow bg-stone-900 border-stone-700"></div>
    `;
    if (document.body) {
        document.body.appendChild(globalTooltipEl);
    }
    return globalTooltipEl;
}

function showTooltipFor(triggerEl) {
    if (!triggerEl) return;
    const key = triggerEl.getAttribute('data-tooltip-key');
    const text = triggerEl.getAttribute('data-tooltip') || (key && RengerTooltipDictionary[key]) || triggerEl.getAttribute('title');
    if (!text) return;

    const tooltip = getOrCreateTooltipElement();
    if (!tooltip) return;

    const textEl = tooltip.querySelector('#renger-tooltip-text');
    const arrowEl = tooltip.querySelector('#renger-tooltip-arrow');
    if (textEl) textEl.innerHTML = text;

    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.classList.add('active');

    const rect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 12;

    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

    if (left < padding) left = padding;
    if (left + tooltipRect.width > winWidth - padding) {
        left = winWidth - padding - tooltipRect.width;
    }

    let top = rect.top - tooltipRect.height - 8;
    let placeBelow = false;
    if (top < padding) {
        top = rect.bottom + 8;
        placeBelow = true;
    }
    if (top + tooltipRect.height > winHeight - padding) {
        top = Math.max(padding, winHeight - padding - tooltipRect.height);
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;

    if (arrowEl) {
        const arrowLeft = rect.left + (rect.width / 2) - left - 4;
        const clampedArrowLeft = Math.max(8, Math.min(tooltipRect.width - 16, arrowLeft));
        arrowEl.style.left = `${Math.round(clampedArrowLeft)}px`;
        if (placeBelow) {
            arrowEl.style.top = '-4px';
            arrowEl.style.bottom = 'auto';
            arrowEl.style.borderTop = '1px solid #44403c';
            arrowEl.style.borderLeft = '1px solid #44403c';
            arrowEl.style.borderBottom = 'none';
            arrowEl.style.borderRight = 'none';
        } else {
            arrowEl.style.bottom = '-4px';
            arrowEl.style.top = 'auto';
            arrowEl.style.borderBottom = '1px solid #44403c';
            arrowEl.style.borderRight = '1px solid #44403c';
            arrowEl.style.borderTop = 'none';
            arrowEl.style.borderLeft = 'none';
        }
    }

    activeTooltipTrigger = triggerEl;
}

function hideTooltip() {
    if (globalTooltipEl) {
        globalTooltipEl.classList.remove('active');
    }
    activeTooltipTrigger = null;
}

function initTooltips() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

    // Écouteur survol bureau (mouseenter / mouseleave par capture)
    document.addEventListener('mouseover', (e) => {
        const trigger = e.target && e.target.closest ? e.target.closest('.renger-info-tooltip') : null;
        if (trigger) {
            showTooltipFor(trigger);
        }
    }, true);

    document.addEventListener('mouseout', (e) => {
        const trigger = e.target && e.target.closest ? e.target.closest('.renger-info-tooltip') : null;
        if (trigger && activeTooltipTrigger === trigger) {
            hideTooltip();
        }
    }, true);

    // Écouteur accessibilité clavier (focusin / focusout)
    document.addEventListener('focusin', (e) => {
        const trigger = e.target && e.target.closest ? e.target.closest('.renger-info-tooltip') : null;
        if (trigger) {
            showTooltipFor(trigger);
        }
    });

    document.addEventListener('focusout', (e) => {
        const trigger = e.target && e.target.closest ? e.target.closest('.renger-info-tooltip') : null;
        if (trigger && activeTooltipTrigger === trigger) {
            hideTooltip();
        }
    });

    // Fermeture avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (globalTooltipEl && globalTooltipEl.classList.contains('active')) {
                hideTooltip();
            }
        }
    });

    // Écouteur tactile / mobile (tap pour ouvrir / clic extérieur pour fermer)
    document.addEventListener('click', (e) => {
        const trigger = e.target && e.target.closest ? e.target.closest('.renger-info-tooltip') : null;
        if (trigger) {
            e.stopPropagation();
            if (activeTooltipTrigger === trigger && globalTooltipEl && globalTooltipEl.classList.contains('active')) {
                hideTooltip();
            } else {
                showTooltipFor(trigger);
            }
        } else {
            hideTooltip();
        }
    });

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('scroll', () => hideTooltip(), { passive: true });
        window.addEventListener('resize', () => hideTooltip(), { passive: true });
    }
}

function createTooltip(textOrKey, extraClass = '') {
    const isKey = RengerTooltipDictionary && RengerTooltipDictionary[textOrKey];
    const text = isKey ? RengerTooltipDictionary[textOrKey] : textOrKey;
    const safeText = String(text || '').replace(/"/g, '&quot;');
    const keyAttr = isKey ? ` data-tooltip-key="${textOrKey}"` : '';
    return `<span class="renger-info-tooltip inline-flex items-center ml-1 text-stone-400 hover:text-terracotta-500 cursor-help transition-colors ${extraClass}" tabindex="0" role="button" aria-label="${safeText}" data-tooltip="${safeText}"${keyAttr}><svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01"/></svg></span>`;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', initTooltips);
    } else {
        initTooltips();
    }
}

// ==========================================
// 2. NAVIGATION & UI
// ==========================================
const pages = ['welcome-screen', 'buyer-page', 'seller-page', 'detail-page', 'inspection-page', 'profile-page', 'settings-page', 'public-profile-page'];

function showPage(pageId) {
    // Extinction propre de la caméra dès qu'on quitte la page d'inspection (évite la fuite matérielle)
    if (pageId !== 'inspection-page' && typeof videoStream !== 'undefined' && videoStream) {
        if (typeof stopCamera === 'function') stopCamera();
    }

    const target = document.getElementById(pageId);
    if (target) {
        pages.forEach(p => {
            const el = document.getElementById(p);
            if (el) el.classList.add('hidden');
        });
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
        
        if (pageId === 'inspection-page' && typeof startCamera === 'function') { 
            startCamera(); 
        }

        if (pageId === 'seller-page' && typeof initSellerPageDynamicTools === 'function') {
            initSellerPageDynamicTools();
        }

        // Synchronisation de l'onglet actif dans la navigation mobile
        if (typeof updateMobileNavState === 'function') {
            updateMobileNavState(pageId);
        }
    } else {
        const pageMap = {
            'welcome-screen': 'index.html',
            'buyer-page': 'remorques.html',
            'seller-page': 'louer-ma-remorque.html',
            'detail-page': 'remorque.html',
            'inspection-page': 'inspection.html',
            'profile-page': 'profil.html?p=profile-page',
            'settings-page': 'profil.html?p=settings-page',
            'public-profile-page': 'profil.html?p=public-profile-page',
            'stats-page': 'stats.html'
        };
        if (pageMap[pageId]) {
            window.location.href = pageMap[pageId];
        }
    }
}

function updateMobileNavState(pageId) {
    const navExplore = document.getElementById('mobile-nav-explore');
    const navBookings = document.getElementById('mobile-nav-bookings');
    const navSettings = document.getElementById('mobile-nav-settings');
    if (!navExplore || !navBookings || !navSettings) return;

    const inactiveClass = "mobile-nav-btn flex flex-col items-center gap-1 w-20 text-stone-400 hover:text-terracotta-500 transition-transform active:scale-95";
    const activeClass = "mobile-nav-btn flex flex-col items-center gap-1 w-20 text-terracotta-500 transition-transform active:scale-95";

    navExplore.className = (pageId === 'buyer-page' || pageId === 'welcome-screen' || pageId === 'detail-page' || pageId === 'seller-page') ? activeClass : inactiveClass;
    navBookings.className = (pageId === 'profile-page') ? activeClass : inactiveClass;
    navSettings.className = (pageId === 'settings-page' || pageId === 'public-profile-page') ? activeClass : inactiveClass;
}



// ==========================================
// GESTION DU MENU UTILISATEUR & AUTHENTIFICATION UI
// ==========================================
function updateUserMenu(user) {
    const container = document.getElementById('user-menu-container');
    if (!container) return;

    if (user) {
        // Extraction du nom : full_name Google ou première partie de l'adresse email
        const displayName = user.user_metadata?.full_name || 
                            user.user_metadata?.name || 
                            (user.email ? user.email.split('@')[0] : 'Utilisateur');

        const isSupremeAdmin = (user.email === 'enism2007@hotmail.com' || user.email === 'einsm2007@gmail.com') || 
                               (user.is_admin === true) || 
                               (user.user_metadata?.is_admin === true) || 
                               (typeof window !== 'undefined' && window.__rengerIsAdmin === true);

        const syniLinkHtml = isSupremeAdmin ? `
                <a href="syni.html" id="nav-syni-link" class="text-stone-400 hover:text-terracotta-500 transition flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80" title="Syni Admin Panel">
                    ${getRengerIcon('eye', 'w-3.5 h-3.5 inline-block')} <span>Syni</span>
                </a>
        ` : '';

        container.innerHTML = `
            <div class="flex items-center gap-2 sm:gap-4">
                <a href="louer-ma-remorque.html" id="nav-rent-my-trailer-link" class="text-xs sm:text-sm font-bold bg-terracotta-500 hover:bg-terracotta-600 text-white py-1.5 px-3 rounded-xl shadow-sm transition inline-flex items-center gap-1 active:scale-95" title="Louer ma remorque">
                    <span>+</span> <span>Louer ma remorque</span>
                </a>
                <a href="profil.html" class="flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:text-terracotta-500 font-semibold text-sm transition group" title="Accéder à Mon Espace">
                    <span class="w-8 h-8 rounded-full bg-terracotta-50 dark:bg-stone-800 text-terracotta-600 flex items-center justify-center font-bold text-xs border border-terracotta-200 dark:border-stone-700 group-hover:scale-105 transition-transform">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </span>
                    <span class="hidden md:inline" id="user-display-name"></span>
                </a>
                ${syniLinkHtml}
                <a href="profil.html?p=settings-page" class="text-stone-500 dark:text-stone-400 font-medium text-sm hover:text-terracotta-500 transition hidden lg:block">Paramètres</a>
                <button onclick="handleLogout()" class="text-stone-400 hover:text-red-500 text-sm font-medium transition hover:underline">Déconnexion</button>
            </div>
        `;
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = displayName;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal()" class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 hover:text-terracotta-500 font-semibold py-2 px-4 rounded-xl shadow-sm transition">
                <span data-i18n="login">Se connecter</span>
            </button>
        `;
    }
}

function switchAuthTab(tab) {
    const loginPanel = document.getElementById('auth-panel-login');
    const signupPanel = document.getElementById('auth-panel-signup');
    const resetPanel = document.getElementById('auth-panel-reset');
    const tabsContainer = document.getElementById('auth-modal-tabs');
    const tabLoginBtn = document.getElementById('auth-tab-login');
    const tabSignupBtn = document.getElementById('auth-tab-signup');

    if (resetPanel) resetPanel.classList.add('hidden');
    if (tabsContainer) tabsContainer.classList.remove('hidden');

    if (tab === 'signup') {
        if (loginPanel) loginPanel.classList.add('hidden');
        if (signupPanel) signupPanel.classList.remove('hidden');
        if (tabSignupBtn) {
            tabSignupBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm";
        }
        if (tabLoginBtn) {
            tabLoginBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white";
        }
    } else {
        if (signupPanel) signupPanel.classList.add('hidden');
        if (loginPanel) loginPanel.classList.remove('hidden');
        if (tabLoginBtn) {
            tabLoginBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm";
        }
        if (tabSignupBtn) {
            tabSignupBtn.className = "flex-1 py-2 text-sm font-bold rounded-xl transition text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white";
        }
    }
}
if (typeof window !== 'undefined') {
    window.switchAuthTab = switchAuthTab;
}

function openAuthModal(defaultTab = 'login') { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
    switchAuthTab(defaultTab);
}

function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}
if (typeof window !== 'undefined') {
    window.updateUserMenu = updateUserMenu;
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
}


function handleAuthModalBackdrop(event) {
    if (event.target === document.getElementById('auth-modal')) {
        closeAuthModal();
    }
}

function handleBookingConfirmModalBackdrop(event) {
    if (event.target === document.getElementById('booking-confirm-modal')) {
        closeBookingConfirmModal();
    }
}

// Écouteur global pour fermer la modale active avec la touche Échap et navigation clavier
if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (event) => {
        const onboardingModal = document.getElementById('onboarding-modal');
        const isOnboardingOpen = onboardingModal && !onboardingModal.classList.contains('hidden');

        if (event.key === 'Escape') {
            const modals = [
                { id: 'syni-action-modal', close: () => { const m = document.getElementById('syni-action-modal'); if (m) m.classList.add('hidden'); } },
                { id: 'review-modal', close: closeReviewModal },
                { id: 'chat-modal', close: closeChatModal },
                { id: 'booking-confirm-modal', close: closeBookingConfirmModal },
                { id: 'auth-modal', close: closeAuthModal },
                { id: 'boost-modal', close: () => { if (typeof closeBoostModal === 'function') closeBoostModal(); } },
                { id: 'inspection-success-modal', close: () => { if (typeof closeInspectionSuccessModal === 'function') closeInspectionSuccessModal(); } },
                { id: 'planning-day-modal', close: () => { if (window.RengerPlanning && typeof window.RengerPlanning.closeDayModal === 'function') window.RengerPlanning.closeDayModal(); } },
                { id: 'modal-block-dates', close: () => { if (window.RengerPlanning && typeof window.RengerPlanning.closeBlockDatesModal === 'function') window.RengerPlanning.closeBlockDatesModal(); } },
                { id: 'onboarding-modal', close: skipOnboarding }
            ];

            for (const m of modals) {
                const el = document.getElementById(m.id);
                if (el && !el.classList.contains('hidden')) {
                    m.close();
                    break;
                }
            }
            return;
        }

        if (isOnboardingOpen && typeof onboardingState !== 'undefined' && onboardingState.track) {
            if (event.key === 'ArrowRight') {
                nextOnboardingStep();
            } else if (event.key === 'ArrowLeft') {
                prevOnboardingStep();
            }
        }
    });
}

function showResetPanel() {
    const tabsContainer = document.getElementById('auth-modal-tabs');
    if (tabsContainer) tabsContainer.classList.add('hidden');
    const loginPanel = document.getElementById('auth-panel-login');
    if (loginPanel) loginPanel.classList.add('hidden');
    const signupPanel = document.getElementById('auth-panel-signup');
    if (signupPanel) signupPanel.classList.add('hidden');
    const resetPanel = document.getElementById('auth-panel-reset');
    if (resetPanel) resetPanel.classList.remove('hidden');

    // Pré-remplir l'email si déjà saisi
    const emailVal = document.getElementById('login-email')?.value || document.getElementById('signup-email')?.value;
    if (emailVal) {
        const resetEl = document.getElementById('reset-email');
        if (resetEl) resetEl.value = emailVal;
    }
}

function showLoginPanel() {
    switchAuthTab('login');
}

async function handleResetPassword() {
    if (!supabaseClient) return showToast("Erreur: Supabase non chargé.", "error");
    const email = document.getElementById('reset-email').value.trim();
    if (!email) return showToast("Veuillez saisir votre email.", "error");

    const resetBtn = document.querySelector('#auth-panel-reset button[onclick="handleResetPassword()"]');
    if (resetBtn) resetBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) {
            showToast("Erreur : " + error.message, "error");
        } else {
            showToast("Lien envoyé ! Vérifiez votre boîte mail.", "success");
            closeAuthModal();
        }
    } finally {
        if (resetBtn) resetBtn.disabled = false;
    }
}

// Gestion et persistance du mode sombre/clair
function initTheme() {
    const savedTheme = localStorage.getItem('renger_theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('renger_theme', isDark ? 'dark' : 'light');
}

// ==========================================
// 10. SYSTÈME D'ÉVALUATIONS & D'AVIS (ÉTOILES)
// ==========================================

let currentReviewBookingId = null;
let currentReviewTrailerId = null;
let selectedModalRating = 0;

const RATING_DESCRIPTIONS = {
    1: "1/5 — Décevant",
    2: "2/5 — Passable",
    3: "3/5 — Bien",
    4: "4/5 — Très bien",
    5: "5/5 — Excellent !"
};

/**
 * Génère le badge visuel de notation avec SVG étoiles
 */
function renderRatingBadge(ratingAvg, ratingCount, isDetailed = false) {
    const container = document.createElement('div');
    const count = parseInt(ratingCount) || 0;
    const avg = parseFloat(ratingAvg) || 0;
    const starSvg = '<svg class="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline-block" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';

    if (count > 0) {
        if (isDetailed) {
            container.className = 'inline-flex items-center gap-1.5 text-base font-bold text-stone-900 dark:text-white';
            container.innerHTML = `
                ${starSvg}
                <span>${avg.toFixed(1)}</span>
                <span class="text-stone-400 font-normal text-sm">(${count} avis)</span>
            `;
        } else {
            container.className = 'inline-flex items-center gap-1 text-xs font-bold text-stone-800 dark:text-stone-200';
            container.innerHTML = `
                ${starSvg}
                <span>${avg.toFixed(1)}</span>
                <span class="text-stone-400 font-normal">(${count})</span>
            `;
        }
    } else {
        container.className = 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md';
        container.innerHTML = `${starSvg}<span>Nouveau</span>`;
    }
    return container;
}

/**
 * Génère un groupe de 5 étoiles SVG pleines / vides
 */
function renderStarSVGs(rating, sizeClass = "w-4 h-4") {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-0.5';
    const roundedRating = Math.round(Number(rating) || 0);

    for (let i = 1; i <= 5; i++) {
        const isFilled = i <= roundedRating;
        const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        star.setAttribute("class", `${sizeClass} ${isFilled ? 'text-amber-400 fill-amber-400' : 'text-stone-200 dark:text-stone-700 fill-stone-200 dark:fill-stone-700'}`);
        star.setAttribute("viewBox", "0 0 24 24");
        star.innerHTML = '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>';
        wrapper.appendChild(star);
    }
    return wrapper;
}

/**
 * Vérifie si le currentUser a une réservation payée sur cette remorque non encore notée
 */
async function checkUserReviewEligibility(trailer) {
    if (!currentUser || !trailer) return;

    const { data: userBookings, error } = await supabaseClient
        .from('bookings')
        .select('id, status')
        .eq('trailer_id', trailer.id)
        .eq('renter_id', currentUser.id)
        .eq('status', 'paye');

    if (error || !userBookings || userBookings.length === 0) return;

    const bookingIds = userBookings.map(b => b.id);
    const { data: existingReviews } = await supabaseClient
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds);

    const reviewedIds = new Set((existingReviews || []).map(r => r.booking_id));
    const unreviewedBooking = userBookings.find(b => !reviewedIds.has(b.id));

    const promptEl = document.getElementById('detail-review-prompt');
    if (unreviewedBooking && promptEl) {
        promptEl.classList.remove('hidden');
        const btn = document.getElementById('detail-review-prompt-btn');
        if (btn) {
            btn.onclick = () => openReviewModal(unreviewedBooking.id, trailer.id, trailer.title);
        }
    }
}

/**
 * Charge et affiche les avis d'une remorque dans detail-reviews-list
 */
async function loadTrailerReviews(trailerId) {
    const list = document.getElementById('detail-reviews-list');
    const badge = document.getElementById('detail-reviews-count-badge');
    if (!list) return;

    list.innerHTML = '<p class="text-sm text-stone-400 italic">Chargement des avis...</p>';

    const { data: reviews, error } = await supabaseClient
        .from('reviews')
        .select('id, rating, comment, created_at, renter_id')
        .eq('trailer_id', trailerId)
        .order('created_at', { ascending: false });

    if (error || !reviews) {
        list.innerHTML = '<p class="text-sm text-stone-400 italic">Impossible de charger les avis.</p>';
        return;
    }

    if (badge) badge.textContent = reviews.length;

    if (reviews.length === 0) {
        list.innerHTML = `
            <div class="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-6 text-center border border-stone-100 dark:border-stone-700">
                <p class="text-stone-500 dark:text-stone-300 text-sm font-semibold mb-1">Cette remorque n'a pas encore reçu d'avis.</p>
                <p class="text-xs text-stone-400">Soyez le premier locataire à partager votre expérience après réservation !</p>
            </div>
        `;
        return;
    }

    // Récupérer les profils des locataires ayant laissé un avis
    const renterIds = [...new Set(reviews.map(r => r.renter_id))];
    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', renterIds);
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    reviews.forEach(rev => {
        const profile = profilesMap.get(rev.renter_id) || { username: 'Locataire', avatar_url: null };
        const card = document.createElement('div');
        card.className = 'bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700 rounded-2xl p-5';

        // En-tête avis (avatar + username + date + étoiles)
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-3 mb-3';

        const userRow = document.createElement('div');
        userRow.className = 'flex items-center gap-3';

        const avatar = renderAvatar(profile, 40);
        userRow.appendChild(avatar);

        const nameDateDiv = document.createElement('div');
        const usernameEl = document.createElement('p');
        usernameEl.className = 'font-bold text-stone-800 dark:text-white text-sm';
        usernameEl.textContent = '@' + profile.username;

        const dateEl = document.createElement('p');
        dateEl.className = 'text-[11px] text-stone-400';
        const d = new Date(rev.created_at);
        dateEl.textContent = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });

        nameDateDiv.appendChild(usernameEl);
        nameDateDiv.appendChild(dateEl);
        userRow.appendChild(nameDateDiv);

        const stars = renderStarSVGs(rev.rating, "w-4 h-4");

        header.appendChild(userRow);
        header.appendChild(stars);
        card.appendChild(header);

        // Commentaire (si présent)
        if (rev.comment) {
            const commentEl = document.createElement('p');
            commentEl.className = 'text-sm text-stone-600 dark:text-stone-300 leading-relaxed pl-13';
            commentEl.textContent = rev.comment; // textContent = XSS-safe
            card.appendChild(commentEl);
        }

        fragment.appendChild(card);
    });
    list.appendChild(fragment);
}

/**
 * Ouvre la modale d'évaluation pour une réservation
 */
function openReviewModal(bookingId, trailerId, trailerTitle) {
    if (!currentUser) {
        showToast("Vous devez être connecté pour noter.", "error");
        openAuthModal();
        return;
    }

    currentReviewBookingId = bookingId;
    currentReviewTrailerId = trailerId;
    selectedModalRating = 0;

    const modal = document.getElementById('review-modal');
    if (!modal) return;

    const subtitle = document.getElementById('review-modal-subtitle');
    if (subtitle) subtitle.textContent = trailerTitle || "Location de remorque";

    const commentInput = document.getElementById('review-comment-input');
    if (commentInput) commentInput.value = '';

    updateModalStarDisplay(0);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = "Sélectionnez une note";
        label.className = "text-sm font-semibold text-stone-400 mt-2 h-5";
    }

    modal.classList.remove('hidden');
}

/**
 * Ferme la modale d'évaluation
 */
function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
    currentReviewBookingId = null;
    currentReviewTrailerId = null;
    selectedModalRating = 0;
}

function handleReviewModalBackdrop(event) {
    if (event.target === document.getElementById('review-modal')) {
        closeReviewModal();
    }
}

function previewModalRating(rating) {
    updateModalStarDisplay(rating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = RATING_DESCRIPTIONS[rating] || "";
        label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
    }
}

function resetModalRatingPreview() {
    updateModalStarDisplay(selectedModalRating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        if (selectedModalRating > 0) {
            label.textContent = RATING_DESCRIPTIONS[selectedModalRating] || "";
            label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
        } else {
            label.textContent = "Sélectionnez une note";
            label.className = "text-sm font-semibold text-stone-400 mt-2 h-5";
        }
    }
}

function setModalRating(rating) {
    selectedModalRating = rating;
    updateModalStarDisplay(rating);
    const label = document.getElementById('modal-rating-label');
    if (label) {
        label.textContent = RATING_DESCRIPTIONS[rating] || "";
        label.className = "text-sm font-bold text-terracotta-600 dark:text-terracotta-400 mt-2 h-5";
    }
}

function updateModalStarDisplay(rating) {
    const buttons = document.querySelectorAll('.modal-star-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.className = 'modal-star-btn p-1 text-amber-400 fill-amber-400 hover:scale-110 transition-transform';
        } else {
            btn.className = 'modal-star-btn p-1 text-stone-300 dark:text-stone-600 fill-stone-300 dark:fill-stone-600 hover:scale-110 transition-transform';
        }
    });
}

/**
 * Soumission de l'avis vers Supabase
 */
async function submitReview() {
    if (!currentUser) return showToast("Vous devez être connecté.", "error");
    if (!selectedModalRating || selectedModalRating < 1 || selectedModalRating > 5) {
        return showToast("Veuillez sélectionner une note entre 1 et 5 étoiles.", "error");
    }
    if (!currentReviewBookingId || !currentReviewTrailerId) {
        return showToast("Réservation introuvable.", "error");
    }

    const commentInput = document.getElementById('review-comment-input');
    const comment = commentInput ? commentInput.value.trim() : "";
    const submitBtn = document.getElementById('review-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const { error } = await supabaseClient.from('reviews').insert([{
            trailer_id: currentReviewTrailerId,
            renter_id: currentUser.id,
            booking_id: currentReviewBookingId,
            rating: selectedModalRating,
            comment: comment || null
        }]);

        if (error) {
            showToast("Erreur lors de la publication : " + error.message, "error");
            return;
        }

        showToast("Merci pour votre évaluation !", "success");
        const trailerIdToRefresh = currentReviewTrailerId;
        closeReviewModal();

        // Rafraîchir les données de la remorque et la vue
        const detailPage = document.getElementById('detail-page');
        if (detailPage && !detailPage.classList.contains('hidden') && currentTrailer && currentTrailer.id === trailerIdToRefresh) {
            const { data: updatedTrailer } = await supabaseClient
                .from('trailers')
                .select('*')
                .eq('id', trailerIdToRefresh)
                .single();
            if (updatedTrailer) {
                currentTrailer = updatedTrailer;
                openTrailerDetail(updatedTrailer);
            }
        }

        const profilePage = document.getElementById('profile-page');
        if (profilePage && !profilePage.classList.contains('hidden')) {
            loadProfileData();
        }

        // Recharger le catalogue en arrière-plan
        loadTrailers();
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}
// ==========================================
// HUBS RÉGIONAUX SEO SUISSE ROMANDE
// ==========================================
const RENGER_SEO_HUBS = [
    { name: 'Location Remorque Vaud', canton: 'Vaud', url: 'location-remorque-vaud.html' },
    { name: 'Location Remorque Genève', canton: 'Genève', url: 'location-remorque-geneve.html' },
    { name: 'Location Remorque Valais', canton: 'Valais', url: 'location-remorque-valais.html' }
];

function injectSeoFooterLinks() {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function' || typeof document.getElementById !== 'function') return;
    const footer = document.querySelector('footer');
    if (!footer || document.getElementById('footer-seo-hubs')) return;

    const hubsContainer = document.createElement('div');
    hubsContainer.id = 'footer-seo-hubs';
    hubsContainer.className = 'w-full pt-4 mt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs text-stone-500 dark:text-stone-400';
    hubsContainer.innerHTML = `
        <span class="font-bold text-stone-600 dark:text-stone-300">Hubs régionaux :</span>
        <a href="location-remorque-vaud.html" class="hover:text-terracotta-500 transition font-medium">Location Remorque Vaud</a>
        <span class="text-stone-300 dark:text-stone-700">•</span>
        <a href="location-remorque-geneve.html" class="hover:text-terracotta-500 transition font-medium">Location Remorque Genève</a>
        <span class="text-stone-300 dark:text-stone-700">•</span>
        <a href="location-remorque-valais.html" class="hover:text-terracotta-500 transition font-medium">Location Remorque Valais</a>
    `;
    footer.prepend(hubsContainer);
}

function initPageUIState() {
    if (typeof window === 'undefined') return;
    const path = (window.location && window.location.pathname) || '';
    const search = (window.location && window.location.search) || '';
    let pageId = 'welcome-screen';
    if (path.includes('remorques.html') || path.includes('remorque.html')) pageId = 'buyer-page';
    else if (path.includes('louer-ma-remorque.html')) pageId = 'seller-page';
    else if (path.includes('profil.html')) {
        pageId = search.includes('settings') ? 'settings-page' : 'profile-page';
    }
    if (typeof updateMobileNavState === 'function') {
        updateMobileNavState(pageId);
    }
    checkAndTriggerOnboarding();
    initBroadcastBanner();
    initMaintenanceMode();
    injectSeoFooterLinks();
}

// ==========================================
// BANDEAU D'ANNONCE GLOBAL & MODE MAINTENANCE
// ==========================================
function initBroadcastBanner() {
    try {
        if (typeof window === 'undefined' || typeof document === 'undefined' || !window.localStorage) return;
        const raw = window.localStorage.getItem('renger_broadcast_banner');
        const existing = document.getElementById('renger-broadcast-banner');
        if (!raw) {
            if (existing) existing.remove();
            return;
        }

        let config;
        try { config = JSON.parse(raw); } catch (_) { return; }
        if (!config || !config.enabled || !config.message) {
            if (existing) existing.remove();
            return;
        }

        // Vérifier si dismissible et déjà masqué par l'utilisateur pour cette version du bandeau
        const bannerSignature = String(config.updatedAt || config.message || '').trim();
        if (config.dismissible) {
            const dismissedSig = (window.sessionStorage && sessionStorage.getItem('renger_banner_dismissed'))
                || (window.localStorage && window.localStorage.getItem('renger_banner_dismissed'));
            if (dismissedSig && (dismissedSig === 'true' || dismissedSig === bannerSignature)) {
                if (existing) existing.remove();
                return;
            }
        }

        if (existing) existing.remove();

        // Classes de thème
        let typeClasses = 'bg-sky-600 border-sky-500 text-white';
        let iconSvg = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        if (config.type === 'success') {
            typeClasses = 'bg-emerald-600 border-emerald-500 text-white';
            iconSvg = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        } else if (config.type === 'warning') {
            typeClasses = 'bg-amber-600 border-amber-500 text-white';
            iconSvg = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
        } else if (config.type === 'danger') {
            typeClasses = 'bg-red-600 border-red-500 text-white';
            iconSvg = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        }

        const bannerEl = document.createElement('div');
        bannerEl.id = 'renger-broadcast-banner';
        bannerEl.className = `w-full py-2.5 px-4 text-xs font-medium border-b flex items-center justify-between gap-3 shadow-md z-[9990] transition-all ${typeClasses}`;

        const msgEscaped = String(config.message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let linkHtml = '';
        if (config.linkText && config.linkUrl) {
            const rawUrl = String(config.linkUrl || '').trim();
            // Sécurité protocolaire : interdiction des schémas malveillants javascript: ou data:
            const isSafeUrl = !/^javascript:/i.test(rawUrl) && !/^data:/i.test(rawUrl);
            if (isSafeUrl) {
                const linkTextEscaped = String(config.linkText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const linkUrlEscaped = rawUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                linkHtml = `<a href="${linkUrlEscaped}" class="underline font-bold hover:opacity-90 ml-2 whitespace-nowrap">${linkTextEscaped} &rarr;</a>`;
            }
        }

        let closeBtnHtml = '';
        if (config.dismissible) {
            closeBtnHtml = `
                <button type="button" id="btn-close-broadcast-banner" class="p-1 hover:bg-black/20 rounded-lg transition text-white/90 hover:text-white flex-shrink-0" title="Masquer l'annonce">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            `;
        }

        bannerEl.innerHTML = `
            <div class="flex items-center gap-2.5 mx-auto text-center justify-center flex-1">
                ${iconSvg}
                <span>${msgEscaped}${linkHtml}</span>
            </div>
            ${closeBtnHtml}
        `;

        if (document.body) {
            document.body.prepend(bannerEl);
            const closeBtn = document.getElementById('btn-close-broadcast-banner');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    try {
                        const sigToStore = bannerSignature || 'true';
                        if (window.sessionStorage) sessionStorage.setItem('renger_banner_dismissed', sigToStore);
                    } catch (_) {}
                    bannerEl.remove();
                };
            }
        }
    } catch (_) {}
}

function initMaintenanceMode() {
    try {
        if (typeof window === 'undefined' || typeof document === 'undefined' || !window.localStorage) return;
        const raw = window.localStorage.getItem('renger_maintenance_mode');
        const overlay = document.getElementById('renger-maintenance-overlay');
        const badge = document.getElementById('renger-maintenance-admin-badge');

        if (!raw) {
            if (overlay) overlay.remove();
            if (badge) badge.remove();
            return;
        }

        let config;
        try { config = JSON.parse(raw); } catch (_) { return; }
        if (!config || !config.enabled) {
            if (overlay) overlay.remove();
            if (badge) badge.remove();
            return;
        }

        const path = (window.location && window.location.pathname) || '';
        const isSyniPage = path.includes('syni.html');

        // Vérifier si l'utilisateur est admin suprême (priorité email maître ou profil admin)
        let isAdmin = false;
        if (typeof window !== 'undefined' && window.__rengerIsAdmin === true) {
            isAdmin = true;
        }
        if (typeof currentUser !== 'undefined' && currentUser) {
            if (currentUser.email === 'enism2007@hotmail.com' || currentUser.email === 'einsm2007@gmail.com' || currentUser.is_admin === true || currentUser.user_metadata?.is_admin === true) {
                isAdmin = true;
            }
        }

        if (isAdmin || isSyniPage) {
            // L'administrateur a un accès complet avec badge discret
            if (overlay) overlay.remove();
            if (!badge && document.body) {
                const badgeEl = document.createElement('div');
                badgeEl.id = 'renger-maintenance-admin-badge';
                badgeEl.className = 'fixed top-3 right-3 z-[99999] bg-red-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-2xl border border-red-400 flex items-center gap-2 backdrop-blur animate-pulse';
                badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-white"></span><span>Mode Maintenance Actif</span>';
                document.body.appendChild(badgeEl);
            }
            return;
        }

        // Pour tout autre visiteur : écran de maintenance bloquant
        if (badge) badge.remove();
        if (!overlay && document.body) {
            const overlayEl = document.createElement('div');
            overlayEl.id = 'renger-maintenance-overlay';
            overlayEl.className = 'fixed inset-0 z-[999999] bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center select-none';
            const msg = String(config.message || "Maintenance technique en cours sur Renger.ch. Retour du service d'ici quelques instants. Merci de votre patience.")
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            overlayEl.innerHTML = `
                <div class="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-5">
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <h1 class="text-2xl font-black text-white">Maintenance en Cours</h1>
                    <p class="text-xs text-stone-300 leading-relaxed">${msg}</p>
                    <div class="pt-4 border-t border-stone-800 text-stone-500 text-[10px]">
                        <span>Renger Infrastructure v2.4</span>
                    </div>
                </div>
            `;
            document.body.appendChild(overlayEl);
        }
    } catch (_) {}
}

// Déclencheurs furtifs d'accès secret à Syni (Raccourci clavier Cmd+Shift+S / Ctrl+Shift+S et 5 clics footer)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            window.location.href = 'syni.html';
        }
    });

    let secretFooterClicks = 0;
    let secretFooterTimer = null;
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target && typeof target.textContent === 'string' && target.textContent.includes('Renger Suisse')) {
            secretFooterClicks++;
            clearTimeout(secretFooterTimer);
            if (secretFooterClicks >= 5) {
                secretFooterClicks = 0;
                window.location.href = 'syni.html';
            } else {
                secretFooterTimer = setTimeout(() => { secretFooterClicks = 0; }, 2500);
            }
        }
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageUIState);
    } else {
        initPageUIState();
    }
}


// Aliases & fallbacks for backwards compatibility
function showWelcomeScreen() {
    window.location.href = 'index.html';
}
function subscribePro() {
    if (typeof handleSubscribePro === 'function') {
        handleSubscribePro();
    }
}

// Initialisation immédiate du menu utilisateur si l'état auth a déjà été résolu
if (typeof currentUser !== 'undefined' && currentUser) {
    updateUserMenu(currentUser);
}

// ==========================================
// GUIDE NOUVEAUX UTILISATEURS (ONBOARDING)
// ==========================================
const ONBOARDING_TRACKS = {
    renter: {
        title: "Guide Locataire",
        badge: "Je cherche une remorque (Locataire)",
        steps: [
            {
                number: 1,
                icon: "search",
                title: "1. Recherche par canton & permis (B vs BE)",
                tooltipKey: "permis-b-be",
                description: "Explorez les remorques disponibles dans votre région (Vaud, Genève, Valais, etc.). Chaque annonce précise explicitement si votre permis de conduire voiture standard (catégorie B, pour les remorques ≤ 750 kg ou ensembles ≤ 3'500 kg) suffit, ou si le permis remorque (BE) est requis.",
                tip: "<strong>Astuce Suisse :</strong> Filtrez par canton ou activez la vue carte Leaflet pour voir instantanément les remorques les plus proches de chez vous."
            },
            {
                number: 2,
                icon: "card",
                title: "2. Réservation & caution non débitée",
                tooltipKey: "caution-non-debitee",
                description: "Réservez vos dates en toute sérénité. Votre paiement est sécurisé par Stripe. La caution légale (de 200 à 400 CHF selon le gabarit de la remorque) fait l'objet d'une simple empreinte bancaire non débitée : aucun centime n'est prélevé de votre compte bancaire.",
                tip: "<strong>Zéro avance :</strong> L'empreinte bancaire Stripe est libérée automatiquement après restitution conforme de la remorque."
            },
            {
                number: 3,
                icon: "camera",
                title: "3. État des lieux photo 4/4 géolocalisé au départ et au retour",
                tooltipKey: "etat-lieux-certifie",
                description: "Au départ comme au retour de la location, prenez 4 photos guidées (avant, arrière, côté gauche, côté droit). Vos clichés sont certifiés avec coordonnées GPS et horodatage suisse infalsifiable pour vous protéger à 100% contre tout litige injustifié.",
                tip: "<strong>Protection juridique :</strong> Votre contrat de bail suisse (CO art. 253) et votre rapport d'état des lieux (CO art. 257a) sont téléchargeables en PDF certifié à tout moment."
            }
        ]
    },
    owner: {
        title: "Guide Propriétaire",
        badge: "Je loue ma remorque (Propriétaire)",
        steps: [
            {
                number: 1,
                icon: "edit",
                title: "1. Publication d'annonce en 2 minutes",
                tooltipKey: "ptac",
                description: "Déposez votre remorque en quelques clics : photos, dimensions utiles, PTAC, charge utile et tarif journalier. Notre système vous suggère un tarif optimisé en fonction du marché suisse local pour rentabiliser immédiatement votre équipement.",
                tip: "<strong>Mise en ligne instantanée :</strong> Votre remorque apparaît dès publication auprès des locataires de votre région."
            },
            {
                number: 2,
                icon: "card",
                title: "2. Liaison bancaire Stripe Connect pour les virements",
                tooltipKey: "stripe-connect",
                description: "Renseignez votre IBAN suisse dans vos Paramètres grâce à notre intégration Stripe Connect certifiée. À chaque location réalisée, vos gains (80% net, ou 100% avec Renger PRO) sont transférés automatiquement sur votre compte bancaire sans aucune démarche manuelle.",
                tip: "<strong>Virements 100% automatisés :</strong> Stripe gère la conformité bancaire et effectue vos virements directement."
            },
            {
                number: 3,
                icon: "crown",
                title: "3. Validation de l'état des lieux & 0% commission avec le mode PRO",
                tooltipKey: "renger-pro",
                description: "La validation de l'état des lieux photo de départ débloque la réservation et sécurise vos fonds. Pour maximiser vos revenus, passez au mode Renger PRO (39 CHF/mois) pour conserver 100% de vos gains (0% de commission) et débloquer le cockpit Renger Analytics PRO.",
                tip: "<strong>Rentabilité maximale :</strong> Avec Renger PRO, votre abonnement est amorti dès deux locations par mois !"
            }
        ]
    }
};

let onboardingState = {
    track: null,
    step: 0
};

function ensureOnboardingModalExists() {
    let modal = document.getElementById('onboarding-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'onboarding-modal';
        modal.className = 'hidden fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto';
        modal.onclick = handleOnboardingBackdrop;
        modal.innerHTML = `
        <div class="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-stone-200 dark:border-stone-700 my-auto" onclick="event.stopPropagation()">
            <button id="onboarding-skip-btn" onclick="skipOnboarding()" class="absolute top-5 right-5 text-xs font-bold text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 px-3 py-1.5 rounded-full transition flex items-center gap-1.5 active:scale-95" aria-label="Passer le guide">
                <span>Passer le guide</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div id="onboarding-content"></div>
            <div id="onboarding-footer" class="mt-8 pt-4 border-t border-stone-100 dark:border-stone-700 flex items-center justify-between gap-4">
                <button id="onboarding-prev-btn" onclick="prevOnboardingStep()" class="text-sm font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 px-4 py-2 rounded-xl transition hidden">
                    ← Précédent
                </button>
                <div id="onboarding-dots" class="flex items-center gap-2 mx-auto"></div>
                <button id="onboarding-next-btn" onclick="nextOnboardingStep()" class="bg-terracotta-500 hover:bg-terracotta-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-md active:scale-95 hidden">
                    Suivant →
                </button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    return modal;
}

function renderOnboardingStep() {
    const content = document.getElementById('onboarding-content');
    const prevBtn = document.getElementById('onboarding-prev-btn');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const dots = document.getElementById('onboarding-dots');
    if (!content) return;

    if (onboardingState.step === 0 || !onboardingState.track) {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        if (dots) dots.innerHTML = '';

        content.innerHTML = `
            <div class="text-center mb-6">
                <div class="w-16 h-16 rounded-2xl bg-terracotta-50 dark:bg-stone-700 text-terracotta-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                </div>
                <h3 class="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Bienvenue sur Renger !</h3>
                <p class="text-stone-500 dark:text-stone-400 text-sm mt-1.5">Découvrez comment utiliser Renger pas-à-pas en moins d'une minute.</p>
                <p class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-2">Choisissez votre profil pour commencer :</p>
            </div>

            <div class="space-y-3.5">
                <button type="button" id="onboarding-choice-renter" onclick="selectOnboardingTrack('renter')" class="w-full text-left p-5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 hover:border-terracotta-500 dark:hover:border-terracotta-500 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-terracotta-50/30 dark:hover:bg-terracotta-950/20 transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-terracotta-500 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                            ${getRengerIcon('car', 'w-6 h-6')}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <h4 class="font-extrabold text-stone-900 dark:text-white group-hover:text-terracotta-500 transition-colors">Je cherche une remorque (Locataire)</h4>
                                <span class="text-terracotta-500 font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Recherche par canton & permis (B vs BE), réservation avec caution non débitée et état des lieux photo 4/4 géolocalisé.</p>
                        </div>
                    </div>
                </button>

                <button type="button" id="onboarding-choice-owner" onclick="selectOnboardingTrack('owner')" class="w-full text-left p-5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 hover:border-terracotta-500 dark:hover:border-terracotta-500 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-terracotta-50/30 dark:hover:bg-terracotta-950/20 transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-terracotta-500 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                            ${getRengerIcon('trailer', 'w-6 h-6')}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <h4 class="font-extrabold text-stone-900 dark:text-white group-hover:text-terracotta-500 transition-colors">Je loue ma remorque (Propriétaire)</h4>
                                <span class="text-terracotta-500 font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Publication d'annonce en 2 min, liaison bancaire Stripe Connect pour les virements et 0% de commission avec le mode PRO.</p>
                        </div>
                    </div>
                </button>
            </div>
        `;
        return;
    }

    const trackData = ONBOARDING_TRACKS[onboardingState.track];
    if (!trackData) return;
    const currentStepIndex = onboardingState.step - 1;
    const stepInfo = trackData.steps[currentStepIndex];
    if (!stepInfo) return;

    if (prevBtn) {
        prevBtn.classList.remove('hidden');
        prevBtn.textContent = onboardingState.step === 1 ? '← Changer de profil' : '← Précédent';
    }
    if (nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = onboardingState.step === 3 ? 'Terminer et explorer' : 'Suivant →';
    }

    if (dots) {
        dots.innerHTML = trackData.steps.map((s, idx) => `
            <button onclick="goToOnboardingStep(${idx + 1})" class="h-2 rounded-full transition-all ${idx === currentStepIndex ? 'w-6 bg-terracotta-500' : 'w-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-400'}" aria-label="Étape ${idx + 1}"></button>
        `).join('');
    }

    const actionCtaHtml = onboardingState.step === 3 ? `
        <div class="pt-2">
            ${onboardingState.track === 'renter' ? `
                <a href="remorques.html" onclick="completeOnboarding()" class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl shadow-md transition text-sm active:scale-95">
                    ${getRengerIcon('search', 'w-4 h-4')}
                    <span>Trouver une remorque disponible</span>
                    <span>→</span>
                </a>
            ` : `
                <a href="louer-ma-remorque.html" onclick="completeOnboarding()" class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl shadow-md transition text-sm active:scale-95">
                    ${getRengerIcon('plus', 'w-4 h-4')}
                    <span>Publier une annonce en 2 min</span>
                    <span>→</span>
                </a>
            `}
        </div>
    ` : '';

    content.innerHTML = `
        <div class="mb-5 pt-4 sm:pt-0">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pr-24 sm:pr-0">
                <span class="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    ${trackData.badge} • Étape ${onboardingState.step}/3
                </span>
                <button type="button" onclick="selectOnboardingTrack('${onboardingState.track === 'renter' ? 'owner' : 'renter'}')" class="text-xs text-terracotta-600 dark:text-terracotta-400 hover:underline font-bold transition">
                    Basculer côté ${onboardingState.track === 'renter' ? 'Propriétaire' : 'Locataire'}
                </button>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-terracotta-500/10 text-terracotta-500 flex items-center justify-center flex-shrink-0 shadow-inner">
                    ${getRengerIcon(stepInfo.icon || 'search', 'w-6 h-6 text-terracotta-500')}
                </div>
                <div>
                    <h3 class="text-xl font-black text-stone-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>${stepInfo.title}</span>
                        ${stepInfo.tooltipKey ? createTooltip(stepInfo.tooltipKey) : ''}
                    </h3>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">${stepInfo.description}</p>
            <div class="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                ${stepInfo.tip}
            </div>
            ${actionCtaHtml}
        </div>
    `;
}

function selectOnboardingTrack(role) {
    if (role !== 'renter' && role !== 'owner') return;
    onboardingState.track = role;
    onboardingState.step = 1;
    renderOnboardingStep();
}

function nextOnboardingStep() {
    if (onboardingState.step === 0) return;
    if (onboardingState.step < 3) {
        onboardingState.step += 1;
        renderOnboardingStep();
    } else {
        completeOnboarding();
    }
}

function prevOnboardingStep() {
    if (onboardingState.step <= 1) {
        onboardingState.step = 0;
        onboardingState.track = null;
        renderOnboardingStep();
    } else {
        onboardingState.step -= 1;
        renderOnboardingStep();
    }
}

function goToOnboardingStep(stepNumber) {
    if (onboardingState.track && stepNumber >= 1 && stepNumber <= 3) {
        onboardingState.step = stepNumber;
        renderOnboardingStep();
    }
}

function openOnboardingModal(preferredTrack = null) {
    ensureOnboardingModalExists();
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    if (preferredTrack && (preferredTrack === 'renter' || preferredTrack === 'owner')) {
        onboardingState.track = preferredTrack;
        onboardingState.step = 1;
    } else {
        onboardingState.track = null;
        onboardingState.step = 0;
    }
    renderOnboardingStep();
    modal.classList.remove('hidden');
}

function closeOnboardingModal(markCompleted = false) {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.add('hidden');
    if (markCompleted) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('renger_onboarding_completed', 'true');
            }
        } catch (_) {}
    }
}

function skipOnboarding() {
    closeOnboardingModal(true);
    if (typeof showToast === 'function') {
        showToast("Guide ignoré. Vous pouvez le retrouver à tout moment dans vos Paramètres.", "info");
    }
}

function completeOnboarding() {
    closeOnboardingModal(true);
    if (typeof showToast === 'function') {
        showToast("Guide terminé ! Bonne route avec Renger.", "success");
    }
}

function handleOnboardingBackdrop(event) {
    if (event.target === document.getElementById('onboarding-modal')) {
        skipOnboarding();
    }
}

function checkAndTriggerOnboarding() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const completed = localStorage.getItem('renger_onboarding_completed');
        if (completed) return;

        const path = (window.location && window.location.pathname) || '';
        const search = (window.location && window.location.search) || '';
        if (path.includes('inspection.html') || search.includes('stripe=') || search.includes('code=') || search.includes('token=')) {
            return;
        }

        setTimeout(() => {
            if (!localStorage.getItem('renger_onboarding_completed')) {
                openOnboardingModal();
            }
        }, 700);
    } catch (_) {}
}

if (typeof window !== 'undefined') {
    window.openOnboardingModal = openOnboardingModal;
    window.closeOnboardingModal = closeOnboardingModal;
    window.skipOnboarding = skipOnboarding;
    window.completeOnboarding = completeOnboarding;
    window.selectOnboardingTrack = selectOnboardingTrack;
    window.nextOnboardingStep = nextOnboardingStep;
    window.prevOnboardingStep = prevOnboardingStep;
    window.goToOnboardingStep = goToOnboardingStep;
    window.handleOnboardingBackdrop = handleOnboardingBackdrop;
    window.checkAndTriggerOnboarding = checkAndTriggerOnboarding;
    window.ONBOARDING_TRACKS = ONBOARDING_TRACKS;
    window.RengerIcons = RengerIcons;
    window.getRengerIcon = getRengerIcon;
    window.RengerTooltipDictionary = RengerTooltipDictionary;
    window.createTooltip = createTooltip;
    window.initTooltips = initTooltips;
    window.showTooltipFor = showTooltipFor;
    window.hideTooltip = hideTooltip;
    window.initBroadcastBanner = initBroadcastBanner;
    window.initMaintenanceMode = initMaintenanceMode;
    window.RENGER_SEO_HUBS = RENGER_SEO_HUBS;
    window.injectSeoFooterLinks = injectSeoFooterLinks;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openOnboardingModal,
        closeOnboardingModal,
        skipOnboarding,
        completeOnboarding,
        selectOnboardingTrack,
        nextOnboardingStep,
        prevOnboardingStep,
        goToOnboardingStep,
        handleOnboardingBackdrop,
        checkAndTriggerOnboarding,
        ONBOARDING_TRACKS,
        RengerIcons,
        getRengerIcon,
        RengerTooltipDictionary,
        createTooltip,
        initTooltips,
        showTooltipFor,
        hideTooltip,
        initBroadcastBanner,
        initMaintenanceMode,
        RENGER_SEO_HUBS,
        injectSeoFooterLinks
    };
}
