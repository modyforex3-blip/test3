/**
 * i18n & Multi-language Auto-detection Engine
 * موقع مليونير | Millionaire Portal
 */

const translations = {
  ar: {
    siteName: "مليونير",
    tagline: "بوابتك الأولى لأقوى التطبيقات والأدوات الرقمية لرواد الأعمال والمستثمرين",
    home: "الرئيسية",
    allApps: "كافة التطبيقات",
    categories: "التصنيفات",
    contactUs: "اتصل بنا",
    privacyPolicy: "سياسة الخصوصية",
    adminPanel: "لوحة الإدارة",
    searchPlaceholder: "ابحث عن تطبيق، أداة، أو منصة...",
    searchBtn: "بحث",
    filterAll: "الكل",
    filterFinance: "تداول واستثمار",
    filterCrypto: "عملات وبلوكتشين",
    filterAi: "ذكاء اصطناعي",
    filterTools: "أدوات وإنتاجية",
    featuredApps: "التطبيقات المميزة",
    latestApps: "أحدث التطبيقات والأدوات",
    viewApp: "عرض التفاصيل",
    directOpen: "فتح التطبيق",
    featuresTitle: "أهم مميزات التطبيق:",
    downloadsCount: "تحميل",
    ratingText: "تقييم المستخدمين",
    sponsored: "إعلان ممول",
    relatedApps: "تطبيقات ذات صلة",
    backToHome: "العودة للرئيسية",
    shareApp: "مشاركة التطبيق",
    shareSuccess: "تم نسخ رابط التطبيق بنجاح!",
    
    // Contact page
    contactTitle: "تواصل مع فريق إدارة مليونير",
    contactDesc: "نسعد باستفساراتكم، مقترحاتكم، وطلبات إضافة التطبيقات والإعلانات التجارية.",
    fullName: "الاسم الكامل",
    emailAddress: "البريد الإلكتروني",
    subject: "موضوع الرسالة",
    messageBody: "نص الرسالة أو الاستفسار...",
    sendMsgBtn: "إرسال الرسالة الآن",
    msgSending: "جاري الإرسال...",
    msgSuccess: "تم إرسال رسالتك بنجاح! سنرد عليك في أقرب وقت.",
    
    // Privacy Policy
    privacyTitle: "سياسة الخصوصية وشروط الاستخدام",
    privacySub: "نحن في منصة مليونير نلتزم بأقصى معايير حماية البيانات وسياسات الخصوصية الدولية.",
    
    // Footer
    footerRights: "جميع الحقوق محفوظة © 2026 منصة مليونير (Millionaire).",
    footerDisclaimer: "منصة مستقلة لعرض ومراجعة أفضل التطبيقات والأدوات الرقمية للارتقاء بأعمالك واستثماراتك."
  },
  en: {
    siteName: "Millionaire",
    tagline: "Your Premier Gateway to Elite Apps & Tools for Entrepreneurs and Investors",
    home: "Home",
    allApps: "All Apps",
    categories: "Categories",
    contactUs: "Contact Us",
    privacyPolicy: "Privacy Policy",
    adminPanel: "Admin Panel",
    searchPlaceholder: "Search for apps, tools, platforms...",
    searchBtn: "Search",
    filterAll: "All",
    filterFinance: "Trading & Finance",
    filterCrypto: "Crypto & Blockchain",
    filterAi: "AI Automation",
    filterTools: "Tools & Productivity",
    featuredApps: "Featured Apps",
    latestApps: "Latest Apps & Tools",
    viewApp: "View Details",
    directOpen: "Open App",
    featuresTitle: "Key Features:",
    downloadsCount: "Downloads",
    ratingText: "User Rating",
    sponsored: "Sponsored Ad",
    relatedApps: "Related Apps",
    backToHome: "Back to Home",
    shareApp: "Share App",
    shareSuccess: "App link copied successfully!",
    
    // Contact page
    contactTitle: "Contact Millionaire Team",
    contactDesc: "We welcome your inquiries, suggestions, partnership requests, and advertising proposals.",
    fullName: "Full Name",
    emailAddress: "Email Address",
    subject: "Subject",
    messageBody: "Your message or inquiry...",
    sendMsgBtn: "Send Message Now",
    msgSending: "Sending...",
    msgSuccess: "Your message has been sent successfully! We will get back to you shortly.",
    
    // Privacy Policy
    privacyTitle: "Privacy Policy & Terms of Service",
    privacySub: "At Millionaire, we strictly adhere to global privacy standards and advertiser safety guidelines.",
    
    // Footer
    footerRights: "All Rights Reserved © 2026 Millionaire Platform.",
    footerDisclaimer: "An independent platform curating and showcasing top-tier digital tools and applications."
  }
};

class I18nManager {
  constructor() {
    this.currentLang = this.detectInitialLanguage();
    this.init();
  }

  detectInitialLanguage() {
    // 1. Check user choice from localStorage
    const saved = localStorage.getItem('millionaire_lang');
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }

    // 2. Check browser navigator language
    const navLangs = navigator.languages || [navigator.language || navigator.userLanguage || ''];
    for (const lang of navLangs) {
      if (lang && lang.toLowerCase().startsWith('ar')) {
        return 'ar';
      }
    }

    // 3. Check timezone heuristics (Arab region timezones)
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const arabZones = [
        'Cairo', 'Riyadh', 'Dubai', 'Baghdad', 'Kuwait', 'Qatar', 'Amman',
        'Beirut', 'Casablanca', 'Tunis', 'Algiers', 'Muscat', 'Bahrain',
        'Jerusalem', 'Gaza', 'Hebron', 'Khartoum', 'Tripoli', 'Damascus', 'Aden', 'Sanaa'
      ];
      if (arabZones.some(zone => timeZone.includes(zone))) {
        return 'ar';
      }
    } catch (e) {
      // ignore
    }

    // Default to Arabic or English based on preference; user requested location-based
    return 'ar'; // default for the Arab world
  }

  init() {
    this.setLanguage(this.currentLang, false);
  }

  t(key) {
    if (translations[this.currentLang] && translations[this.currentLang][key]) {
      return translations[this.currentLang][key];
    }
    return translations['en'][key] || key;
  }

  setLanguage(lang, reload = true) {
    if (lang !== 'ar' && lang !== 'en') lang = 'ar';
    this.currentLang = lang;
    localStorage.setItem('millionaire_lang', lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    this.translateDOM();

    // Trigger custom event so page scripts can react
    window.dispatchEvent(new CustomEvent('millionaire_lang_changed', { detail: { lang } }));

    // Update switcher buttons UI
    const switcherBtns = document.querySelectorAll('.lang-switcher-btn');
    switcherBtns.forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('active-lang');
      } else {
        btn.classList.remove('active-lang');
      }
    });
  }

  toggleLanguage() {
    const nextLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.setLanguage(nextLang);
  }

  translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('placeholder')) {
            el.setAttribute('placeholder', text);
          }
        } else {
          el.textContent = text;
        }
      }
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text) {
        el.setAttribute('placeholder', text);
      }
    });
  }
}

// Global instance
window.i18n = new I18nManager();
