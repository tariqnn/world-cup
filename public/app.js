const STORAGE_KEY = "nashamaArenaRegistrations";
const LANGUAGE_KEY = "nashamaArenaLanguage";
const FIREBASE_COLLECTION = "registrations";
const SITE_CONTENT_COLLECTION = "siteContent";
const SITE_CONTENT_DOC = "main";
const EVENTS_COLLECTION = "events";
const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Bikers%20Village%20Airport%20Rd.%2C%20Amman%2C%20Jordan";
const MAP_EMBED_URL =
  "https://www.google.com/maps?q=Bikers%20Village%20Airport%20Rd.%2C%20Amman%2C%20Jordan&output=embed";

let registrationsCache = [];
let siteContent = null;
let eventsCache = [];
let firestoreDb = null;
let firestoreEnabled = false;
const registrationSubscribers = new Set();
let selectedTickets = {};

const I18N = {
  en: {
    "skip.registration": "Skip to registration",
    "skip.table": "Skip to table",
    "skip.checkin": "Skip to check-in list",
    "brand.public": "Nashama Arena",
    "brand.admin": "Nashama Admin",
    "brand.checkin": "Check-in",
    "nav.categories": "Categories",
    "nav.experience": "Experience",
    "nav.register": "Register",
    "nav.registrationSite": "Registration site",
    "nav.mobileCheckin": "Mobile check-in",
    "nav.exportCsv": "Export CSV",
    "nav.exportJson": "Export JSON",
    "nav.lang": "العربية",
    "hero.eyebrow": "World Cup fan event at Bikers Village",
    "hero.title": "Register for Nashama Arena access",
    "hero.lead": "Secure theatre seating, VIP front-zone access, or charity support passes for the World Cup fan experience.",
    "event.date": "Date: November 21, 2026",
    "event.time": "Time: 7:00 PM",
    "event.location": "Location: Bikers Village",
    "hero.cta": "Start registration",
    "hero.secondary": "View categories",
    "partners.hosted": "Hosted with",
    "categories.eyebrow": "Registration categories",
    "categories.title": "Choose the access level that fits your guest",
    "categories.copy": "Categories are based on the ticket reference: VIP, theatre seating classes, and support contribution entries.",
    "category.select": "Select category",
    "category.ticket": "per ticket",
    "category.badge.vip": "VIP",
    "category.badge.general": "General admission",
    "category.badge.support": "Support",
    "category.badge.seating": "Seating",
    "experience.eyebrow": "Venue experience",
    "experience.title": "Big-screen football, seating zones, and family areas",
    "experience.copy": "The event layout includes a main tent, large screens, sponsor and market booths, food and beverage, and a dedicated children's play area.",
    "feature.tent": "Main tent and theatre seating",
    "feature.vip": "VIP front-zone access",
    "feature.children": "Children's activities and selfie booth",
    "feature.checkin": "Digital confirmation for staff check-in",
    "register.eyebrow": "Register now",
    "register.title": "Guest details",
    "register.copy": "Submit the form once per guest or group. The system captures category, ticket count, total value, and current handling status.",
    "form.fullName": "Full name *",
    "form.email": "Email *",
    "form.phone": "Phone *",
    "form.category": "Category *",
    "form.quantity": "Tickets *",
    "form.ticketSelection": "Ticket selection *",
    "form.nationality": "Nationality",
    "form.company": "Company / group",
    "form.gender": "Gender *",
    "form.genderPlaceholder": "Select gender",
    "gender.male": "Male",
    "gender.female": "Female",
    "ticket.addCategory": "Ticket type",
    "ticket.addQuantity": "Quantity",
    "ticket.addButton": "Add ticket",
    "ticket.selected": "Selected tickets",
    "ticket.empty": "No tickets selected yet.",
    "ticket.remove": "Remove",
    "form.notes": "Notes",
    "form.notesPlaceholder": "Dietary needs, accessibility support, group name...",
    "form.estimated": "Estimated total",
    "form.payment": "Payment status",
    "payment.paid": "Paid",
    "payment.unpaid": "Unpaid",
    "form.submit": "Submit registration",
    "form.note": "Your confirmation appears below and is saved on this browser for the frontend demo.",
    "footer.public": "Nashama Arena at Bikers Village",
    "error.fullName": "Full name is required.",
    "error.email": "Enter a valid email address.",
    "error.phone": "Phone number is required.",
    "error.category": "Choose a category.",
    "error.quantity": "Choose at least one ticket.",
    "error.tickets": "Choose at least one ticket across the categories.",
    "error.maxTickets": "Choose 20 tickets or fewer per registration.",
    "error.gender": "Choose a gender option.",
    "success.registration": "Registration saved.",
    "success.confirmation": "Confirmation",
    "success.pass": "Pass code",
    "success.total": "Total",
    "admin.eyebrow": "Registration handling",
    "admin.title": "Admin dashboard",
    "admin.copy": "Review registered guests, update handling status, search by contact details, and export a CSV for operations.",
    "stats.registrations": "Total registrations",
    "stats.tickets": "Total tickets",
    "stats.value": "Estimated value",
    "stats.vip": "VIP tickets",
    "panel.guestList": "Guest list",
    "panel.registered": "Registered people",
    "panel.clear": "Clear all",
    "filter.search": "Search",
    "filter.searchPlaceholder": "Name, email, phone, confirmation...",
    "filter.category": "Category",
    "filter.status": "Status",
    "filter.allCategories": "All categories",
    "filter.allStatuses": "All statuses",
    "table.confirmation": "Confirmation",
    "table.guest": "Guest",
    "table.category": "Category",
    "table.tickets": "Tickets",
    "table.total": "Total",
    "table.status": "Status",
    "table.registered": "Registered",
    "table.actions": "Actions",
    "table.pass": "Pass",
    "table.delete": "Delete",
    "empty.admin": "No registrations match the current filters.",
    "confirm.delete": "Delete registration",
    "confirm.clear": "Clear all registrations from this browser?",
    "status.New": "New",
    "status.Confirmed": "Confirmed",
    "status.Checked in": "Checked in",
    "status.Cancelled": "Cancelled",
    "checkin.eyebrow": "Staff phone app",
    "checkin.title": "Mobile check-in",
    "checkin.copy": "Search by name, phone, confirmation, or pass code. Tap check in when the guest arrives.",
    "checkin.search": "Find guest",
    "checkin.searchPlaceholder": "Search guest or pass code",
    "checkin.count": "Visible guests",
    "checkin.checked": "Checked in",
    "checkin.pending": "Not checked in",
    "checkin.button": "Check in",
    "checkin.undo": "Mark not checked in",
    "checkin.empty": "No guests found on this device.",
    "checkin.installNote": "Install from your browser menu to use it like a mobile app.",
    "checkin.localNote": "Frontend-only note: phone data is local until the backend is added.",
    "mobile.openApp": "Open mobile app",
  },
  ar: {
    "skip.registration": "تجاوز إلى التسجيل",
    "skip.table": "تجاوز إلى الجدول",
    "skip.checkin": "تجاوز إلى قائمة الدخول",
    "brand.public": "نشامى أرينا",
    "brand.admin": "إدارة نشامى",
    "brand.checkin": "تسجيل الدخول",
    "nav.categories": "الفئات",
    "nav.experience": "التجربة",
    "nav.register": "التسجيل",
    "nav.registrationSite": "صفحة التسجيل",
    "nav.mobileCheckin": "تطبيق الدخول",
    "nav.exportCsv": "تصدير CSV",
    "nav.exportJson": "تصدير JSON",
    "nav.lang": "English",
    "hero.eyebrow": "فعالية كأس العالم في بيكرز فيليج",
    "hero.title": "سجل دخولك إلى نشامى أرينا",
    "hero.lead": "احجز مقاعد المسرح أو دخول VIP أو تذاكر الدعم الخيري لتجربة جماهير كأس العالم.",
    "event.date": "التاريخ: 21 نوفمبر 2026",
    "event.time": "الوقت: 7:00 مساء",
    "event.location": "الموقع: بيكرز فيليج",
    "hero.cta": "ابدأ التسجيل",
    "hero.secondary": "عرض الفئات",
    "partners.hosted": "بالتعاون مع",
    "categories.eyebrow": "فئات التسجيل",
    "categories.title": "اختر مستوى الدخول المناسب للضيف",
    "categories.copy": "الفئات مبنية على مرجع التذاكر: VIP، فئات مقاعد المسرح، وتذاكر المساهمة الداعمة.",
    "category.select": "اختيار الفئة",
    "category.ticket": "للتذكرة",
    "category.badge.vip": "VIP",
    "category.badge.general": "دخول عام",
    "category.badge.support": "دعم",
    "category.badge.seating": "مقاعد",
    "experience.eyebrow": "تجربة المكان",
    "experience.title": "شاشات كبيرة، مناطق جلوس، ومساحات عائلية",
    "experience.copy": "يشمل المخطط خيمة رئيسية، شاشات كبيرة، أكشاك رعاة وسوق، مأكولات ومشروبات، ومنطقة ألعاب للأطفال.",
    "feature.tent": "الخيمة الرئيسية ومقاعد المسرح",
    "feature.vip": "دخول منطقة VIP الأمامية",
    "feature.children": "أنشطة الأطفال وكشك التصوير",
    "feature.checkin": "تأكيد رقمي لتسجيل دخول الضيوف",
    "register.eyebrow": "سجل الآن",
    "register.title": "بيانات الضيف",
    "register.copy": "أرسل النموذج مرة واحدة لكل ضيف أو مجموعة. يحفظ النظام الفئة وعدد التذاكر والقيمة والحالة الحالية.",
    "form.fullName": "الاسم الكامل *",
    "form.email": "البريد الإلكتروني *",
    "form.phone": "رقم الهاتف *",
    "form.category": "الفئة *",
    "form.quantity": "عدد التذاكر *",
    "form.ticketSelection": "اختيار التذاكر *",
    "form.nationality": "الجنسية",
    "form.company": "الشركة / المجموعة",
    "form.gender": "الجنس *",
    "form.genderPlaceholder": "اختر الجنس",
    "gender.male": "ذكر",
    "gender.female": "أنثى",
    "ticket.addCategory": "نوع التذكرة",
    "ticket.addQuantity": "العدد",
    "ticket.addButton": "إضافة تذكرة",
    "ticket.selected": "التذاكر المختارة",
    "ticket.empty": "لم يتم اختيار تذاكر بعد.",
    "ticket.remove": "حذف",
    "form.notes": "ملاحظات",
    "form.notesPlaceholder": "احتياجات غذائية، دعم وصول، اسم المجموعة...",
    "form.estimated": "الإجمالي المتوقع",
    "form.payment": "حالة الدفع",
    "payment.paid": "مدفوع",
    "payment.unpaid": "غير مدفوع",
    "form.submit": "إرسال التسجيل",
    "form.note": "سيظهر رقم التأكيد أدناه ويتم حفظه في هذا المتصفح للنسخة التجريبية.",
    "footer.public": "نشامى أرينا في بيكرز فيليج",
    "error.fullName": "الاسم الكامل مطلوب.",
    "error.email": "أدخل بريدًا إلكترونيًا صحيحًا.",
    "error.phone": "رقم الهاتف مطلوب.",
    "error.category": "اختر الفئة.",
    "error.quantity": "اختر تذكرة واحدة على الأقل.",
    "error.tickets": "اختر تذكرة واحدة على الأقل من الفئات.",
    "error.maxTickets": "اختر 20 تذكرة أو أقل لكل تسجيل.",
    "error.gender": "اختر خيار الجنس.",
    "success.registration": "تم حفظ التسجيل.",
    "success.confirmation": "رقم التأكيد",
    "success.pass": "رمز الدخول",
    "success.total": "الإجمالي",
    "admin.eyebrow": "إدارة التسجيلات",
    "admin.title": "لوحة الإدارة",
    "admin.copy": "راجع الضيوف المسجلين، حدّث حالة التعامل، ابحث ببيانات التواصل، وصدّر CSV للتشغيل.",
    "stats.registrations": "إجمالي التسجيلات",
    "stats.tickets": "إجمالي التذاكر",
    "stats.value": "القيمة المتوقعة",
    "stats.vip": "تذاكر VIP",
    "panel.guestList": "قائمة الضيوف",
    "panel.registered": "الأشخاص المسجلون",
    "panel.clear": "مسح الكل",
    "filter.search": "بحث",
    "filter.searchPlaceholder": "الاسم، البريد، الهاتف، التأكيد...",
    "filter.category": "الفئة",
    "filter.status": "الحالة",
    "filter.allCategories": "كل الفئات",
    "filter.allStatuses": "كل الحالات",
    "table.confirmation": "التأكيد",
    "table.guest": "الضيف",
    "table.category": "الفئة",
    "table.tickets": "التذاكر",
    "table.total": "الإجمالي",
    "table.status": "الحالة",
    "table.registered": "وقت التسجيل",
    "table.actions": "إجراءات",
    "table.pass": "الرمز",
    "table.delete": "حذف",
    "empty.admin": "لا توجد تسجيلات مطابقة للفلاتر الحالية.",
    "confirm.delete": "حذف التسجيل",
    "confirm.clear": "مسح كل التسجيلات من هذا المتصفح؟",
    "status.New": "جديد",
    "status.Confirmed": "مؤكد",
    "status.Checked in": "تم الدخول",
    "status.Cancelled": "ملغي",
    "checkin.eyebrow": "تطبيق الهاتف للطاقم",
    "checkin.title": "تسجيل دخول الضيوف",
    "checkin.copy": "ابحث بالاسم أو الهاتف أو رقم التأكيد أو رمز الدخول. اضغط تسجيل الدخول عند وصول الضيف.",
    "checkin.search": "البحث عن ضيف",
    "checkin.searchPlaceholder": "ابحث عن ضيف أو رمز دخول",
    "checkin.count": "الضيوف الظاهرون",
    "checkin.checked": "تم الدخول",
    "checkin.pending": "لم يدخل بعد",
    "checkin.button": "تسجيل الدخول",
    "checkin.undo": "إلغاء تسجيل الدخول",
    "checkin.empty": "لا يوجد ضيوف على هذا الجهاز.",
    "checkin.installNote": "ثبته من قائمة المتصفح لاستخدامه كتطبيق جوال.",
    "checkin.localNote": "ملاحظة: البيانات محلية على الهاتف حتى نضيف الباك إند.",
    "mobile.openApp": "فتح تطبيق الهاتف",
  },
};

const CATEGORIES = [
  {
    id: "vip-class",
    name: { en: "VIP Class", ar: "فئة VIP" },
    description: {
      en: "Theatre seating with exclusive front zone experience.",
      ar: "مقاعد مسرحية مع تجربة حصرية في المنطقة الأمامية.",
    },
    access: { en: "VIP access", ar: "دخول VIP" },
    badgeKey: "category.badge.vip",
    price: 35,
    featured: true,
  },
  {
    id: "class-a",
    name: { en: "Class A", ar: "الفئة A" },
    description: {
      en: "Theatre seating in the premium second zone.",
      ar: "مقاعد مسرحية في المنطقة الثانية المميزة.",
    },
    access: { en: "Premium seating", ar: "مقاعد مميزة" },
    badgeKey: "category.badge.seating",
    price: 10,
    featured: false,
  },
  {
    id: "class-b",
    name: { en: "Class B", ar: "الفئة B" },
    description: {
      en: "Theatre seating in the third zone seating experience.",
      ar: "مقاعد مسرحية ضمن تجربة المنطقة الثالثة.",
    },
    access: { en: "Standard seating", ar: "مقاعد عادية" },
    badgeKey: "category.badge.seating",
    price: 5,
    featured: false,
  },
  {
    id: "vip-support",
    name: { en: "VIP Support Class", ar: "فئة دعم VIP" },
    description: {
      en: "Exclusive charity contribution with special support access.",
      ar: "مساهمة خيرية حصرية مع دخول دعم خاص.",
    },
    access: { en: "VIP support", ar: "دعم VIP" },
    badgeKey: "category.badge.vip",
    price: 35,
    featured: true,
  },
  {
    id: "support-a",
    name: { en: "Support Class A", ar: "فئة الدعم A" },
    description: {
      en: "Premium charity contribution supporting hope and community.",
      ar: "مساهمة خيرية مميزة لدعم الأمل والمجتمع.",
    },
    access: { en: "Support access", ar: "دخول الدعم" },
    badgeKey: "category.badge.support",
    price: 10,
    featured: false,
  },
  {
    id: "support-b",
    name: { en: "Support Class B", ar: "فئة الدعم B" },
    description: {
      en: "Charity support contribution entry for the initiative.",
      ar: "تذكرة مساهمة خيرية لدعم المبادرة.",
    },
    access: { en: "Community support", ar: "دعم مجتمعي" },
    badgeKey: "category.badge.support",
    price: 5,
    featured: false,
  },
];

const DEFAULT_SITE_CONTENT = {
  heroEyebrow: "World Cup fan event at Bikers Village",
  heroTitle: "Register for Nashama Arena access",
  heroLead: "Big-screen football, food, family areas, and match-night energy at Bikers Village.",
  eventDateValue: "2026-12-18",
  eventDate: "Date: December 18, 2026",
  eventTimeValue: "19:00",
  eventTime: "Time: 7:00 PM",
  mapLocation: "Bikers Village, Airport Road",
  eventLocation: "Location: Bikers Village, Airport Road",
  ticketName: "Nashama Arena Ticket",
  ticketDescription: "One general admission ticket for any selected event date and game.",
  ticketAccess: "General admission",
  ticketPrice: 10,
  experienceTitle: "Big-screen football, seating zones, and family areas",
  experienceCopy:
    "The event layout includes a main tent, large screens, sponsor and market booths, food and beverage, and a dedicated children's play area.",
  featureTent: "Main tent and theatre seating",
  featureVip: "Front screen viewing zones",
  featureChildren: "Children's activities and selfie booth",
  featureCheckin: "Digital confirmation for staff check-in",
  photo1: "assets/venue-layout.jpg",
  photo2: "assets/entrance-zone.jpg",
  photo3: "assets/kids-activity.png",
  heroImage: "assets/vip-pass.jpg",
  ticketPreviewImage: "assets/ticket-preview.jpg",
  mapUrl: MAP_URL,
  mapEmbedUrl: MAP_EMBED_URL,
};

const DEFAULT_EVENTS = [
  {
    id: "opening-night",
    title: "Opening Match Night",
    date: "2026-12-18",
    time: "7:00 PM",
    game: "Jordan vs Brazil",
    teamA: "Jordan",
    teamB: "Brazil",
    flagA: "JO",
    flagB: "BR",
    price: 10,
    image: "assets/match-night.jpg",
    description: "A loud first-night screening with seating, food market, and family space.",
    active: true,
  },
  {
    id: "group-stage-night",
    title: "Group Stage Double Header",
    date: "2026-12-20",
    time: "6:30 PM",
    game: "Spain vs Japan",
    teamA: "Spain",
    teamB: "Japan",
    flagA: "ES",
    flagB: "JP",
    price: 12,
    image: "assets/screen-setup.jpg",
    description: "Two-screen match-night setup with food, drinks, and relaxed seating.",
    active: true,
  },
  {
    id: "final-night",
    title: "Final Night",
    date: "2026-12-30",
    time: "8:00 PM",
    game: "Final screening",
    teamA: "Team A",
    teamB: "Team B",
    flagA: "",
    flagB: "",
    price: 18,
    image: "assets/venue-layout.jpg",
    description: "The big final night with the full arena experience and premium viewing.",
    active: true,
  },
];

function getSiteContent() {
  return { ...DEFAULT_SITE_CONTENT, ...(siteContent || {}) };
}

function eventTicketId(eventId) {
  return `event-ticket-${eventId}`;
}

function eventFromTicketId(categoryId) {
  const eventId = String(categoryId || "").replace(/^event-ticket-/, "");
  if (!eventId || eventId === categoryId) return null;
  return activeEvents().find((event) => event.id === eventId) || null;
}

function getTicketCategory(event = selectedEvent()) {
  const content = getSiteContent();
  if (event) {
    const title = event.title || event.game || "Match night";
    const details = [event.date, event.time, event.game].filter(Boolean).join(" - ");
    return {
      id: eventTicketId(event.id),
      name: { en: `${title} Ticket`, ar: `${title} Ticket` },
      description: { en: details || content.ticketDescription, ar: details || content.ticketDescription },
      access: { en: event.game || content.ticketAccess, ar: event.game || content.ticketAccess },
      badgeKey: "category.badge.general",
      price: Number(event.price ?? content.ticketPrice ?? DEFAULT_SITE_CONTENT.ticketPrice),
      featured: true,
      event,
    };
  }
  return {
    id: "general-ticket",
    name: { en: content.ticketName, ar: content.ticketName },
    description: { en: content.ticketDescription, ar: content.ticketDescription },
    access: { en: content.ticketAccess, ar: content.ticketAccess },
    badgeKey: "category.badge.general",
    price: Number(content.ticketPrice || DEFAULT_SITE_CONTENT.ticketPrice),
    featured: true,
  };
}

function syncSingleTicketCategory() {
  CATEGORIES.splice(0, CATEGORIES.length, getTicketCategory());
}

syncSingleTicketCategory();

function getLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) || "en";
}

function t(key, lang = getLanguage()) {
  return I18N[lang]?.[key] || I18N.en[key] || key;
}

function localized(value, lang = getLanguage()) {
  return typeof value === "object" ? value[lang] || value.en : value;
}

function applyTranslations() {
  const lang = getLanguage();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  syncSingleTicketCategory();

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n, lang);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder, lang));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria, lang));
  });
  document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
    button.textContent = t("nav.lang", lang);
  });

  renderCategoryCards();
  renderTicketPicker();
  renderSiteContent();
  renderEvents();
  populateEventControls();
  populateCategorySelects();
  updateTotal();
  document.dispatchEvent(new CustomEvent("languagechange"));
}

function toggleLanguage() {
  localStorage.setItem(LANGUAGE_KEY, getLanguage() === "en" ? "ar" : "en");
  applyTranslations();
}

function initLanguage() {
  document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
    button.addEventListener("click", toggleLanguage);
  });
  applyTranslations();
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} JOD`;
}

function readRegistrations() {
  if (registrationsCache.length) return registrationsCache;
  try {
    registrationsCache = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return registrationsCache;
  } catch {
    return [];
  }
}

function saveRegistrations(registrations) {
  registrationsCache = registrations;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  notifyRegistrationSubscribers();
}

function notifyRegistrationSubscribers() {
  registrationSubscribers.forEach((callback) => callback(readRegistrations()));
}

function subscribeRegistrations(callback) {
  registrationSubscribers.add(callback);
  callback(readRegistrations());
  return () => registrationSubscribers.delete(callback);
}

function hasValidFirebaseConfig() {
  const config = window.NASHAMA_FIREBASE_CONFIG;
  return Boolean(config?.apiKey && config?.projectId && config?.appId && !config.apiKey.includes("PASTE"));
}

function initFirebaseStore() {
  readRegistrations();
  if (!hasValidFirebaseConfig() || !window.firebase?.firestore) {
    notifyRegistrationSubscribers();
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(window.NASHAMA_FIREBASE_CONFIG);
    firestoreDb = firebase.firestore();
    firestoreEnabled = true;
    const needsRealtimeRead = document.querySelector("#registrationRows, #checkinList");
    if (!needsRealtimeRead) {
      notifyRegistrationSubscribers();
      return;
    }
    firestoreDb
      .collection(FIREBASE_COLLECTION)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          registrationsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(registrationsCache));
          notifyRegistrationSubscribers();
        },
        () => {
          firestoreEnabled = false;
          notifyRegistrationSubscribers();
        }
      );
  } catch {
    firestoreEnabled = false;
    notifyRegistrationSubscribers();
  }
}

function activeEvents() {
  const events = eventsCache.length ? eventsCache : DEFAULT_EVENTS;
  return events
    .filter((event) => event.active !== false)
    .sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));
}

function flagEmoji(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  return normalized
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function renderSiteContent() {
  const content = getSiteContent();
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && value) node.textContent = value;
  };
  const setSrc = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && value) node.src = value;
  };

  setText("[data-content='heroEyebrow']", content.heroEyebrow);
  setText("[data-content='heroTitle']", content.heroTitle);
  setText("[data-content='heroLead']", content.heroLead);
  setText("[data-content='eventDate']", content.eventDate);
  setText("[data-content='eventTime']", content.eventTime);
  setText("[data-content='eventLocation']", content.eventLocation);
  setText("[data-content='experienceTitle']", content.experienceTitle);
  setText("[data-content='experienceCopy']", content.experienceCopy);
  setText("[data-content='featureTent']", content.featureTent);
  setText("[data-content='featureVip']", content.featureVip);
  setText("[data-content='featureChildren']", content.featureChildren);
  setText("[data-content='featureCheckin']", content.featureCheckin);
  setSrc("[data-content-image='heroImage']", content.heroImage);
  setSrc("[data-content-image='ticketPreviewImage']", content.ticketPreviewImage);
  setSrc("[data-content-image='photo1']", content.photo1);
  setSrc("[data-content-image='photo2']", content.photo2);
  setSrc("[data-content-image='photo3']", content.photo3);

  document.querySelectorAll("[data-map-link]").forEach((link) => {
    link.href = content.mapUrl || MAP_URL;
  });
  const mapFrame = document.querySelector("[data-map-frame]");
  if (mapFrame) mapFrame.src = content.mapEmbedUrl || MAP_EMBED_URL;
}

function renderEvents() {
  const grid = document.querySelector("#eventsGrid");
  if (!grid) return;
  const events = activeEvents();
  if (!events.length) {
    grid.innerHTML = `<p class="ticket-empty">Events will appear here soon.</p>`;
    return;
  }

  grid.innerHTML = events
    .map(
      (event) => `
        <article class="event-card">
          <img src="${event.image || "assets/match-night.jpg"}" alt="${event.title || event.game || "Event"}" loading="lazy" />
          <div class="event-card__body">
            <div class="event-card__top">
              <span>${event.date || ""}</span>
              <span>${event.time || ""}</span>
            </div>
            <h3>${event.title || event.game || "Match night"}</h3>
            <p>${event.description || ""}</p>
            <div class="game-line">
              <span>${flagEmoji(event.flagA)} ${event.teamA || ""}</span>
              <strong>vs</strong>
              <span>${flagEmoji(event.flagB)} ${event.teamB || ""}</span>
            </div>
            <div class="event-card__bottom">
              <div class="event-ticket-price">
                <span>Event ticket</span>
                <strong>${formatMoney(event.price || getSiteContent().ticketPrice)}</strong>
              </div>
              <button class="button button--primary" type="button" data-event-buy="${event.id}">Add this ticket</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  grid.querySelectorAll("[data-event-buy]").forEach((button) => {
    button.addEventListener("click", () => selectEventForRegistration(button.dataset.eventBuy));
  });
}

function selectEventForRegistration(eventId) {
  const event = activeEvents().find((item) => item.id === eventId);
  if (!event) return;
  const dateInput = document.querySelector("#eventDate");
  const gameSelect = document.querySelector("#game");
  if (dateInput) dateInput.value = event.date || "";
  populateEventControls();
  if (gameSelect) gameSelect.value = event.id;
  addTicket(eventTicketId(event.id), 1);
  renderTicketPicker();
  updateTotal();
  document.querySelector("#registration")?.scrollIntoView({ behavior: "smooth" });
}

function populateEventControls() {
  const dateInput = document.querySelector("#eventDate");
  const gameSelect = document.querySelector("#game");
  if (!dateInput || !gameSelect) return;
  const events = activeEvents();
  if (!dateInput.value && events[0]?.date) dateInput.value = events[0].date;
  const selectedGame = gameSelect.value;
  const matches = events.filter((event) => !dateInput.value || event.date === dateInput.value);
  gameSelect.innerHTML = matches.length
    ? `<option value="">Select a game</option>${matches
        .map((event) => `<option value="${event.id}">${flagEmoji(event.flagA)} ${event.game || `${event.teamA} vs ${event.teamB}`}</option>`)
        .join("")}`
    : `<option value="">No games for this date</option>`;
  if (matches.some((event) => event.id === selectedGame)) {
    gameSelect.value = selectedGame;
  } else if (matches[0]) {
    gameSelect.value = matches[0].id;
  }
}

function selectedEvent() {
  const id = document.querySelector("#game")?.value || "";
  return activeEvents().find((event) => event.id === id) || null;
}

async function initContentData() {
  siteContent = getSiteContent();
  eventsCache = DEFAULT_EVENTS;
  renderSiteContent();
  renderEvents();
  populateEventControls();
  renderCategoryCards();
  renderTicketPicker();
  updateTotal();

  if (!firestoreEnabled || !firestoreDb) return;

  firestoreDb.collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC).onSnapshot((doc) => {
    if (doc.exists) siteContent = { ...DEFAULT_SITE_CONTENT, ...doc.data() };
    syncSingleTicketCategory();
    renderSiteContent();
    renderCategoryCards();
    renderTicketPicker();
    updateTotal();
  });

  firestoreDb.collection(EVENTS_COLLECTION).orderBy("date").onSnapshot((snapshot) => {
    eventsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderEvents();
    populateEventControls();
  });
}

async function addRegistration(registration) {
  if (firestoreEnabled && firestoreDb) {
    try {
      await Promise.race([
        firestoreDb.collection(FIREBASE_COLLECTION).doc(registration.id).set(registration),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("Firebase write timed out")), 7000);
        }),
      ]);
      return;
    } catch (error) {
      console.warn("Firebase write failed; saved locally instead.", error);
    }
  }
  saveRegistrations([registration, ...readRegistrations()]);
}

async function updateRegistrationStatus(id, status) {
  if (firestoreEnabled && firestoreDb) {
    await firestoreDb.collection(FIREBASE_COLLECTION).doc(id).update({ status });
    return;
  }
  saveRegistrations(readRegistrations().map((item) => (item.id === id ? { ...item, status } : item)));
}

async function deleteRegistrationById(id) {
  if (firestoreEnabled && firestoreDb) {
    await firestoreDb.collection(FIREBASE_COLLECTION).doc(id).delete();
    return;
  }
  saveRegistrations(readRegistrations().filter((item) => item.id !== id));
}

async function clearRegistrations() {
  if (firestoreEnabled && firestoreDb) {
    const snapshot = await firestoreDb.collection(FIREBASE_COLLECTION).get();
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return;
  }
  saveRegistrations([]);
}

function getCategory(id) {
  const event = eventFromTicketId(id);
  return event ? getTicketCategory(event) : CATEGORIES.find((category) => category.id === id) || CATEGORIES[0];
}

function getRegistrationCategoryName(registration, lang = getLanguage()) {
  const category = getCategory(registration.categoryId);
  return localized(category.name, lang) || registration.categoryName;
}

function createConfirmation() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NA-${new Date().getFullYear()}-${random}`;
}

function createPassCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

function renderCategoryCards() {
  const grid = document.querySelector("#categoryGrid");
  if (!grid) return;
  const lang = getLanguage();

  grid.innerHTML = CATEGORIES.map(
    (category, index) => `
      <article class="category-card${category.featured ? " featured" : ""}" style="--stagger: ${index}">
        <div class="category-card__top">
          <span class="category-badge">${t(category.badgeKey, lang)}</span>
          <span class="category-zone">${localized(category.access, lang)}</span>
        </div>
        <h3>${localized(category.name, lang)}</h3>
        <p class="category-meta">${localized(category.description, lang)}</p>
        <div class="category-price">
          <strong>${category.price}</strong>
          <span>JOD<br>${t("category.ticket", lang)}</span>
        </div>
        <button class="button ${category.featured ? "button--ghost" : "button--primary"}" type="button" data-category="${category.id}">
          ${t("category.select", lang)}
        </button>
      </article>
    `
  ).join("");

  grid.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      addTicket(button.dataset.category, 1);
      updateTotal();
      document.querySelector("#registration")?.scrollIntoView({ behavior: "smooth" });
      document.querySelector(`[data-selected-quantity="${button.dataset.category}"]`)?.focus({ preventScroll: true });
    });
  });
}

function renderTicketPicker() {
  const picker = document.querySelector("#ticketPicker");
  if (!picker) return;
  const lang = getLanguage();
  const category = getTicketCategory(selectedEvent());

  picker.innerHTML = `
    <div class="ticket-add">
      <div class="single-ticket-label">
        <span>${localized(category.name, lang)}</span>
        <strong>${formatMoney(category.price)}</strong>
      </div>
      <label>
        ${t("ticket.addQuantity", lang)}
        <input id="ticketQuantityInput" type="number" inputmode="numeric" min="1" max="20" value="1" />
      </label>
      <button class="button button--primary" id="addTicketButton" type="button">${t("ticket.addButton", lang)}</button>
    </div>
    <div class="ticket-selected" aria-live="polite">
      <strong>${t("ticket.selected", lang)}</strong>
      <div class="ticket-selected__list">
        ${renderSelectedTickets(lang)}
      </div>
    </div>
  `;

  picker.querySelector("#addTicketButton")?.addEventListener("click", () => {
    const quantity = Math.max(1, Math.min(20, Number(picker.querySelector("#ticketQuantityInput").value || 1)));
    addTicket(category.id, quantity);
    picker.querySelector("#ticketQuantityInput").value = 1;
  });

  picker.querySelectorAll("[data-selected-quantity]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = Math.max(0, Math.min(20, Number(input.value || 0)));
      if (Number(input.value) === 0) {
        delete selectedTickets[input.dataset.selectedQuantity];
      } else {
        selectedTickets[input.dataset.selectedQuantity] = Number(input.value);
      }
      renderTicketPicker();
      updateTotal();
    });
  });

  picker.querySelectorAll("[data-remove-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      delete selectedTickets[button.dataset.removeTicket];
      renderTicketPicker();
      updateTotal();
    });
  });
}

function renderSelectedTickets(lang = getLanguage()) {
  const entries = Object.entries(selectedTickets).filter(([, quantity]) => Number(quantity) > 0);
  if (!entries.length) return `<p class="ticket-empty">${t("ticket.empty", lang)}</p>`;

  return entries
    .map(([categoryId, quantity]) => {
      const category = getCategory(categoryId);
      const event = category.event;
      const eventMeta = event ? [event.date, event.time, event.game].filter(Boolean).join(" - ") : "";
      return `
        <div class="ticket-row" data-selected-ticket="${category.id}">
          <div>
            <strong>${localized(category.name, lang)}</strong>
            <span>${formatMoney(category.price)} · ${formatMoney(category.price * quantity)}</span>
            ${eventMeta ? `<span>${eventMeta}</span>` : ""}
          </div>
          <input
            type="number"
            inputmode="numeric"
            min="1"
            max="20"
            value="${quantity}"
            data-selected-quantity="${category.id}"
            aria-label="${localized(category.name, lang)} tickets"
          />
          <button type="button" data-remove-ticket="${category.id}">${t("ticket.remove", lang)}</button>
        </div>
      `;
    })
    .join("");
}

function addTicket(categoryId, quantity = 1) {
  selectedTickets[categoryId] = Math.min(20, Number(selectedTickets[categoryId] || 0) + quantity);
  renderTicketPicker();
  updateTotal();
}

function populateCategorySelects() {
  const lang = getLanguage();
  document.querySelectorAll("#category, #categoryFilter").forEach((select) => {
    const currentValue = select.value;
    const keepAll = select.querySelector('option[value="all"]');
    select.innerHTML = keepAll ? `<option value="all">${t("filter.allCategories", lang)}</option>` : "";
    CATEGORIES.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = `${localized(category.name, lang)} - ${formatMoney(category.price)}`;
      select.appendChild(option);
    });
    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  });
}

function updateTotal() {
  const totalPrice = document.querySelector("#totalPrice");
  if (!totalPrice) return;

  const { total } = getTicketSelection();
  totalPrice.textContent = formatMoney(total);
}

function setError(field, message) {
  const error = document.querySelector(`#${field}Error`);
  if (error) error.textContent = message;
}

function getTicketSelection() {
  const tickets = Object.entries(selectedTickets)
    .map(([categoryId, quantity]) => {
      const category = getCategory(categoryId);
      const event = category.event || eventFromTicketId(categoryId);
      quantity = Math.max(0, Number(quantity || 0));
      return {
        categoryId: category.id,
        categoryName: category.name.en,
        eventId: event?.id || "",
        eventTitle: event?.title || "",
        eventDate: event?.date || "",
        eventTime: event?.time || "",
        game: event?.game || "",
        teamA: event?.teamA || "",
        teamB: event?.teamB || "",
        flagA: event?.flagA || "",
        flagB: event?.flagB || "",
        quantity,
        price: category.price,
        total: category.price * quantity,
      };
    })
    .filter((ticket) => ticket.quantity > 0);

  return {
    tickets,
    totalQuantity: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
    total: tickets.reduce((sum, ticket) => sum + ticket.total, 0),
    eventTickets: tickets.filter((ticket) => ticket.eventId),
  };
}

function validateRegistration(formData, ticketSelection) {
  const errors = {};
  if (!formData.fullName.trim()) errors.fullName = t("error.fullName");
  if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
    errors.email = t("error.email");
  }
  if (!formData.phone.trim()) errors.phone = t("error.phone");
  if (!formData.gender) errors.gender = t("error.gender");
  if (!formData.eventDate && !ticketSelection.eventTickets.length) errors.eventDate = "Choose an event date.";
  if (!formData.game && !ticketSelection.eventTickets.length) errors.game = "Choose a game.";
  if (!ticketSelection.totalQuantity || ticketSelection.totalQuantity < 1) errors.tickets = t("error.tickets");
  if (ticketSelection.totalQuantity > 20) errors.tickets = t("error.maxTickets");
  return errors;
}

async function handleRegistrationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());
  const ticketSelection = getTicketSelection();

  ["fullName", "email", "phone", "gender", "eventDate", "game", "tickets"].forEach((field) => setError(field, ""));
  const errors = validateRegistration(data, ticketSelection);
  Object.entries(errors).forEach(([field, message]) => setError(field, message));

  if (Object.keys(errors).length > 0) {
    const firstInvalid = form.querySelector(`#${Object.keys(errors)[0]}`);
    firstInvalid?.focus();
    return;
  }

  const primaryCategory = ticketSelection.tickets.length === 1 ? getCategory(ticketSelection.tickets[0].categoryId) : null;
  const chosenEvent = selectedEvent();
  const firstTicketEvent = ticketSelection.eventTickets[0] || null;
  const hasMultipleEvents = new Set(ticketSelection.eventTickets.map((ticket) => ticket.eventId)).size > 1;
  const registration = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    confirmation: createConfirmation(),
    passCode: createPassCode(),
    fullName: data.fullName.trim(),
    email: data.email.trim(),
    phoneCountryCode: data.countryCode,
    phoneNational: data.phone.trim(),
    phone: `${data.countryCode}${data.phone.trim().replace(/^0+/, "")}`,
    gender: data.gender,
    categoryId: primaryCategory?.id || "multiple",
    categoryName: primaryCategory?.name.en || "Multiple categories",
    eventId: hasMultipleEvents ? "multiple" : chosenEvent?.id || firstTicketEvent?.eventId || data.game || "",
    eventTitle: hasMultipleEvents ? "Multiple events" : chosenEvent?.title || firstTicketEvent?.eventTitle || "",
    eventDate: hasMultipleEvents ? "Multiple dates" : data.eventDate || firstTicketEvent?.eventDate || "",
    game: hasMultipleEvents ? "Multiple games" : chosenEvent?.game || firstTicketEvent?.game || data.game || "",
    teamA: hasMultipleEvents ? "" : chosenEvent?.teamA || firstTicketEvent?.teamA || "",
    teamB: hasMultipleEvents ? "" : chosenEvent?.teamB || firstTicketEvent?.teamB || "",
    flagA: hasMultipleEvents ? "" : chosenEvent?.flagA || firstTicketEvent?.flagA || "",
    flagB: hasMultipleEvents ? "" : chosenEvent?.flagB || firstTicketEvent?.flagB || "",
    eventTime: hasMultipleEvents ? "" : chosenEvent?.time || firstTicketEvent?.eventTime || "",
    tickets: ticketSelection.tickets,
    quantity: ticketSelection.totalQuantity,
    totalQuantity: ticketSelection.totalQuantity,
    price: ticketSelection.tickets.length === 1 ? ticketSelection.tickets[0].price : 0,
    total: ticketSelection.total,
    paidStatus: "Unpaid",
    paid: false,
    notes: data.notes?.trim() || "",
    status: "New",
    createdAt: new Date().toISOString(),
  };

  submitButton.disabled = true;
  try {
    await addRegistration(registration);
  } finally {
    submitButton.disabled = false;
  }

  const successPanel = document.querySelector("#successPanel");
  successPanel.hidden = false;
  successPanel.innerHTML = `
    ${t("success.registration")} ${t("success.confirmation")}: <strong>${registration.confirmation}</strong>.
    ${t("success.pass")}: <strong>${registration.passCode}</strong>.
    ${t("success.total")}: <strong>${formatMoney(registration.total)}</strong>.
  `;

  form.reset();
  selectedTickets = {};
  renderTicketPicker();
  updateTotal();
}

function initRegistrationPage() {
  const form = document.querySelector("#registrationForm");

  renderTicketPicker();
  document.querySelector("#eventDate")?.addEventListener("change", () => {
    populateEventControls();
    renderTicketPicker();
    updateTotal();
  });
  document.querySelector("#game")?.addEventListener("change", () => {
    renderTicketPicker();
    updateTotal();
  });
  form?.addEventListener("submit", handleRegistrationSubmit);
  updateTotal();
}

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initFirebaseStore();
  initContentData();
  initRegistrationPage();
  registerServiceWorker();
});
