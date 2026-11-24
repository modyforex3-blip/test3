/**
 * AI Auto-Blogging Engine for Millionaire Portal
 * روبوت الذكاء الاصطناعي الذاتي للمقالات والأخبار
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

function getDB() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading DB in AI Blogger:', e);
  }
  return { articles: [], aiBlogger: {} };
}

function saveDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving DB in AI Blogger:', e);
    return false;
  }
}

// Distinctive creative topic templates with captivating non-generic journalism
const articleTemplates = [
  {
    category: "ai",
    categoryNameAr: "ذكاء اصطناعي ثوري",
    titleAr: "خفايا هندسة الأوامر: كيف تجعل الذكاء الاصطناعي يفكر كعالم عبقري لا كببغاء رقمي؟",
    titleEn: "Beyond Basic Prompts: Engineering AI to Think Like an Elite Strategist",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80",
    readTime: "5 دقائق قراءة",
    excerpt: "95% من مستخدمي الذكاء الاصطناعي يطرحون أسئلة خاطئة فيحصلون على إجابات مكررة. إليك المنهجية التي تغير قواعد اللعبة كلياً.",
    content: `إذا كنت ما تزال تستخدم أدوات الذكاء الاصطناعي عبر كتابة "اكتب لي مقالاً عن..."، فأنت تهدر 90% من قدرات هذه الثورة التكنولوجية.

الحقيقة التي لا يخبرك بها صناع المحتوى التقليديون هي أن النماذج اللغوية الكبيرة ليست محركات بحث ذكية، بل هي "محاكيات سياقية". كلما كان الأمر الذي تقدمه غامضاً، عادت الخوارزمية إلى المتوسط الإحصائي المبتذل.

### كيف تحول الذكاء الاصطناعي إلى مستشارك الخاص؟

1. **تقنية تقمص الدور العميق (Deep Role-Playing):**
بدلاً من طلب نصيحة مجردة، حدد هوية الخبير بدقة: "تصرف ككبير مهندسي البرمجيات في كبرى شركات التقنية مع 15 عاماً من الخبرة، وقم بنقد هذه الفكرة بقسوة".

2. **التفكير بسلاسل الاستنتاج (Chain of Thought):**
اطلب من الذكاء الاصطناعي أن "يفكر بصوت عالٍ خطوة بخطوة قبل تقديم النتيجة النهائية". هذه التعليمة البسيطة ترفع دقة التحليل بنسبة تتجاوز 40%.

3. **حظر الكلمات المبتذلة:**
أضف دائماً في نهاية أمرك: "تجنب تماماً استخدام المقدمات الإنشائية والعبارات المستهلكة مثل 'في عالمنا المتسارع'".

الذكاء الاصطناعي لن يستبدل المفكرين، لكن المفكرين الذين يتقنون توجيهه سيجعلون من ينافسهم عاجزاً عن اللحاق بهم.`
  },
  {
    category: "productivity",
    categoryNameAr: "إنتاجية متفردة",
    titleAr: "فخ تعدد المهام: لماذا ينتج الهادئون في ساعتين ما يعجز عنه المتوترون في أسبوع؟",
    titleEn: "The Multitasking Trap: Why Quiet Focus Outperforms Frantic Hustle",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&auto=format&fit=crop&q=80",
    readTime: "4 دقائق قراءة",
    excerpt: "الوهم الأكبر في العصر الحديث هو الخلط بين كثرة الحركة وتحقيق النتائج. كيف تصنع إنجازاً ضخماً بأقل مجهود؟",
    content: `المكتب مزدحم بالأوراق، المتصفح يحتوي على 37 تبويباً مفتوحاً، والإشعارات تتوالى كل دقيقة. هذا ليس دليلاً على النجاح، بل هو برهان ساطع على "النزيف المعرفي".

أثبتت دراسات علم الأعصاب الحديثة أن العقل البشري لا يقوم بتعدد المهام في وقت واحد مطلقاً؛ بل يقوم بما يسمى "تبديل السياق السريع"، وفي كل تبديل تفقد جزءاً من طاقتك العقلية وتركيزك العميق.

### قواعد العمل الفائق (Hyper-Focus Rules):

- **حظر الشاشات المتعددة في ساعات الذروة:**
اختر مهمة واحدة مصيرية كل صباح، واغلق كل ما عداها حتى تنتهي.

- **تطبيق تقنية الـ 90 دقيقة البيولوجية:**
يعمل الدماغ البشري بنظام دورات نبضية تستمر قرابة 90 دقيقة تليها حاجة فسيولوجية للراحة لمدة 15 دقيقة. العمل ضد هذا الإيقاع يدمر الإبداع.

- **استخدام أدوات الفلترة التلقائية:**
استعن بتطبيقات التركيز المتاحة على منصة مليونير لحجب التشتت أثناء جلسات العمل الحقيقي.

الإنتاجية الحقيقية ليست أن تكون مشغولاً طوال اليوم، بل أن تكون مؤثراً فيما تفعله.`
  },
  {
    category: "security",
    categoryNameAr: "أمن رقمي استراتيجي",
    titleAr: "التجسس المباح: البصمة الخفية التي يتركها هاتفك حتى لو كان مطفأً!",
    titleEn: "The Silent Fingerprint: What Your Devices Whisper Behind Closed Doors",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&auto=format&fit=crop&q=80",
    readTime: "6 دقائق قراءة",
    excerpt: "هل تساءلت يوماً لماذا تظهر لك إعلانات لمنتجات كنت تفكر فيها فقط؟ الأمر ليس صدفة ولا خيالاً علمياً، بل تتبع سلوكي دقيق.",
    content: `نحن لا نعيش في عصر الخصوصية، بل في عصر "اقتصاد الانتباه والمراقبة التنبؤية". عندما يكون التطبيق مجانياً بالكامل، فالمستخدم وبياناته وسلوكياته هي السلعة الحقيقية التي تُباع للمعلنين.

عبر مئات المجسات الدقيقة في هاتفك (البوصلة، الجيروسكوب، إيقاع كتابتك على الكيبورد، وحتى شبكات الواي فاي المحيطة بك)، تستطيع خوارزميات التتبع بناء "بروفايل نفسي" متكامل لك دون حتى أن تفتح الميكروفون.

### كيف تستعيد سيادتك الرقمية؟

1. **إلغاء معرف الإعلانات الموحد (Advertising ID):**
توجه فوراً لإعدادات الهاتف، وعطل ميزة "تخصيص الإعلانات" وأعد ضبط المعرف الرقمي الخاص بك كل شهر.

2. **التنظيف الدوري للـ WebRTC والكوكيز العميقة:**
المتصفحات التقليدية تحفظ ملفات تعريف لا تحذفها بمجرد إغلاق التبويب. استخدم متصفحات تركز على الخصوصية.

3. **فحص التطبيقات الخاملة:**
التطبيقات التي لم تستخدمها خلال 30 يوماً يجب حذفها فوراً؛ فهي تستمر في جمع البيانات في الخلفية.

حمايتك الرقمية تبدأ بوعيك بأن كل نقرة لها أثر.`
  },
  {
    category: "tech_trends",
    categoryNameAr: "آفاق المستقبل",
    titleAr: "مستقبل بدون شاشات: هل نحن على وشك توديع الهواتف الذكية إلى الأبد؟",
    titleEn: "The Screenless Horizon: Are Smartphones Nearing Their Final Chapter?",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=900&auto=format&fit=crop&q=80",
    readTime: "5 دقائق قراءة",
    excerpt: "الجيل القادم من الحوسبة لن يكون مستطيلاً زجاجياً تحمله في جيبك؛ التفاعل الصوتي والعصبي يزحف بخطى واثقة نحو الواقع.",
    content: `ظل الهاتف الذكي هو المركز العصبي للحياة الحديثة لأكثر من 18 عاماً، لكن التاريخ التكنولوجي يعلمنا أن كل سيطرة مطلقة يعقبها تحول جذري مفاجئ.

مع التطور المذهل للواجهات الصوتية المعتمدة على الذكاء الاصطناعي، والأجهزة القابلة للارتداء مثل الخواتم الذكية، والنظارات المعززة، وبدايات واجهات الدماغ الحاسوبية (BCI)، يبدو شكل المستقبل مختلفاً كلياً عما اعتدنا عليه.

### ما الذي سيتغير في أسلوب حياتنا؟

- **اختفاء التطبيقات بصورتها التقليدية:**
لن تحتاج لتحميل 50 تطبيقاً مختلفاً؛ بل سيكون لديك وكيل ذكاء اصطناعي واحد يتولى كل المعاملات والاتصالات والحجوزات بنبرة صوتك.

- **الحوسبة المحيطية (Ambient Computing):**
الإنترنت سيكون حاضراً في البيئة من حولك، في الحائط، النوافذ، والملابس، دون الحاجة للتحديق في شاشة مضيئة 6 ساعات يومياً.

نحن نقترب من عصر تصبح فيه التكنولوجيا غير مرئية تماماً، ولكنها أكثر فاعلية من أي وقت مضى.`
  }
];

// Generator function
function generateNewArticle(customCategory = null) {
  const db = getDB();
  if (!db.articles) db.articles = [];

  // Pick random template or customize
  let available = articleTemplates;
  if (customCategory) {
    const matched = articleTemplates.filter(t => t.category === customCategory);
    if (matched.length > 0) available = matched;
  }

  const template = available[Math.floor(Math.random() * available.length)];
  const timestamp = Date.now();

  // Add random variation to avoid duplicates
  const variations = [
    "تحليل استثنائي للأدوات الرقمية لرواد الأعمال.",
    "رؤية استشرافية من محرري منصة مليونير التقنية.",
    "قراءة نقدية مغايرة لما هو سائد في عالم التكنولوجيا."
  ];
  const variation = variations[Math.floor(Math.random() * variations.length)];

  const newArticle = {
    id: 'art-' + timestamp,
    titleAr: template.titleAr,
    titleEn: template.titleEn,
    category: template.category,
    categoryNameAr: template.categoryNameAr,
    image: template.image,
    readTime: template.readTime,
    publishedAt: new Date().toISOString(),
    author: "روبوت الذكاء الاصطناعي • منصة مليونير",
    excerpt: template.excerpt + " " + variation,
    content: template.content,
    viewsCount: Math.floor(Math.random() * 800) + 400
  };

  db.articles.unshift(newArticle);
  if (!db.aiBlogger) db.aiBlogger = {};
  db.aiBlogger.lastRun = new Date().toISOString();

  saveDB(db);
  console.log(`🤖 [AI Blogger] تم توليد ونشر مقال جديد بنجاح: "${newArticle.titleAr}"`);
  return newArticle;
}

// Scheduled Auto-Blogger Check (Daily)
function checkAndRunScheduledDailyBlogger() {
  const db = getDB();
  const config = db.aiBlogger || { enabled: true, frequency: "daily" };

  if (!config.enabled) return;

  const lastRun = config.lastRun ? new Date(config.lastRun).getTime() : 0;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // If more than 24 hours passed since last automated publication
  if (now - lastRun >= ONE_DAY_MS) {
    console.log('⏰ [AI Blogger] حان موعد النشر التلقائي اليومي، جاري التوليد...');
    generateNewArticle();
  }
}

// Start daily background interval check (every 1 hour checks if 24h passed)
function initAIBloggerScheduler() {
  // Check on boot
  setTimeout(() => {
    checkAndRunScheduledDailyBlogger();
  }, 5000);

  // Check hourly
  setInterval(() => {
    checkAndRunScheduledDailyBlogger();
  }, 60 * 60 * 1000);
}

module.exports = {
  generateNewArticle,
  checkAndRunScheduledDailyBlogger,
  initAIBloggerScheduler
};
