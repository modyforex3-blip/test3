/**
 * AI SEO, Targeted Social Posts & Promotional Video Studio
 * مولّد البوستات الإعلانية والفيديوهات الترويجية بالاستهداف الذكي لرفع الترافيك بشكل قانوني
 */

(function () {
  'use strict';

  function getSelectedTarget() {
    const sel = document.getElementById('mktTargetSelect');
    const val = sel ? sel.value : 'portal';
    const apps = (window.dashboardData && window.dashboardData.apps) || [];

    if (val === 'portal') {
      return {
        name: 'منصة مليونير - Millionaire Portal',
        desc: 'بوابتك المتكاملة لأحدث تطبيقات الذكاء الاصطناعي، إدارة الثروة، والإنتاجية مجاناً عبر المتصفح.',
        features: ['تشغيل سحابي فوري بدون تثبيت', 'تطبيقات ذكاء اصطناعي وأدوات مالية حصرية', 'مقالات تقنية متجددة يومياً'],
        url: `${window.location.origin}/`
      };
    }

    const app = apps.find(a => a.id === val);
    if (app) {
      return {
        name: app.nameAr || app.nameEn,
        desc: app.shortDescAr || 'تطبيق سحابي احترافي مجاني على منصة مليونير.',
        features: (app.featuresAr && app.featuresAr.length > 0) ? app.featuresAr.slice(0, 3) : ['واجهة سريعة واحترافية', 'يعمل على الموبايل والكمبيوتر', 'مجاني وآمن 100%'],
        url: `${window.location.origin}/app.html?id=${encodeURIComponent(app.id)}`
      };
    }

    return {
      name: 'منصة مليونير',
      desc: 'تطبيقات ويب ذكية وأدوات احترافية مجانية.',
      features: ['سرعة فائقة', 'مجاني بالكامل', 'متوافق مع جميع الأجهزة'],
      url: `${window.location.origin}/`
    };
  }

  function populateMarketingTargets() {
    const sel = document.getElementById('mktTargetSelect');
    if (!sel) return;
    const apps = (window.dashboardData && window.dashboardData.apps) || [];
    const current = sel.value || 'portal';

    sel.innerHTML = `<option value="portal">🌐 الموقع الرئيسي (منصة مليونير الشاملة)</option>` +
      apps.map(a => `<option value="${a.id}">📱 تطبيق: ${a.nameAr}</option>`).join('');

    if (Array.from(sel.options).some(o => o.value === current)) {
      sel.value = current;
    }
  }

  function generateTargetedPost() {
    const target = getSelectedTarget();
    const platform = (document.getElementById('mktPlatform') || {}).value || 'tiktok';
    const audience = (document.getElementById('mktAudience') || {}).value || 'investors';

    const hooks = {
      investors: `🚀 هل ما زلت تدير مشاريعك ومالك بالطرق التقليدية؟\nاكتشف ${target.name} — الأداة التي يعتمد عليها رواد الأعمال الأذكياء في 2026!`,
      ai_users: `🤖 ثورة الذكاء الاصطناعي أصبحت بين يديك مجاناً!\nجرّب ${target.name} الآن مباشرة من متصفحك بدون تحميل أو اشتراكات معقدة.`,
      productivity: `⏱️ وفّر 70% من وقتك اليومي وضاعف إنجازك!\nإليك أسرع أداة رقمية جربتها هذا العام: ${target.name}.`,
      general: `🔥 أداة مجانية مذهلة ستغير طريقتك في استخدام الإنترنت!\nتعرّف على ${target.name} الآن.`
    };

    const hashtags = {
      investors: '#ريادة_الأعمال #إدارة_الثروة #استثمار #تقنية_مالية #مليونير #تطوير_الأعمال #Fintech #WealthTech',
      ai_users: '#ذكاء_اصطناعي #تطبيقات_ذكاء_اصطناعي #تقنية #أدوات_مجانية #AI #ArtificialIntelligence #FutureTech',
      productivity: '#إنتاجية #تنظيم_الوقت #تطبيقات_ويب #عمل_عن_بعد #تطوير_الذات #Productivity #SmartTools',
      general: '#تطبيقات #تقنية #مواقع_مفيدة #تطوير #مليونير #أدوات_رقمية #Tech #WebApps'
    };

    const bullets = target.features.map(f => `✅ ${f}`).join('\n');

    let cta = `👇 جرّبه الآن مجاناً عبر الرابط الرسمي:\n🔗 ${target.url}`;
    if (platform === 'tiktok' || platform === 'instagram') {
      cta = `👇 الرابط في البايو أو اكتب "مليونير" وسنرسل لك الرابط فوراً!\n🔗 ${target.url}`;
    } else if (platform === 'twitter') {
      cta = `🧵 جربه مباشرة من هنا:\n${target.url}`;
    } else if (platform === 'telegram') {
      cta = `⚡ للدخول المباشر والتشغيل الفوري بدون تحميل:\n👉 ${target.url}`;
    }

    const postText = `${hooks[audience] || hooks.general}

${target.desc}

أبرز المميزات:
${bullets}

${cta}

${hashtags[audience] || hashtags.general}`;

    const out = document.getElementById('mktPostOutput');
    if (out) out.value = postText;
  }

  function copyTargetedPost() {
    const out = document.getElementById('mktPostOutput');
    if (!out || !out.value) return alert('قم بتوليد البوست أولاً');
    navigator.clipboard.writeText(out.value).then(() => {
      alert('✅ تم نسخ البوست الإعلاني المستهدف مع الهاشتاجات بنجاح!');
    });
  }

  function generatePromoVideoPackage() {
    const target = getSelectedTarget();
    const duration = (document.getElementById('mktVideoDuration') || {}).value || '30';
    const audience = (document.getElementById('mktAudience') || {}).value || 'investors';

    const audienceAngle = {
      investors: 'رواد الأعمال والمستثمرين الباحثين عن أدوات تحليل وإدارة ذكية',
      ai_users: 'عشاق الذكاء الاصطناعي والباحثين عن أحدث الأدوات السحابية المجانية',
      productivity: 'الموظفين والمستقلين الباحثين عن مضاعفة الإنتاجية',
      general: 'الجمهور العام الباحث عن تطبيقات ويب سريعة ومجانية'
    }[audience] || 'الجمهور المستهدف';

    const scriptText = `🎬 سيناريو فيديو إعلاني احترافي (${duration} ثانية)
🎯 الجمهور المستهدف: ${audienceAngle}
📱 المنتج: ${target.name}

━━━━━━━━━━━━━━━━━━━━━━
⏱️ [00:00 - 00:05] الخطاف البصري والصوتي (Hook):
• المشهد: شاشة سوداء تتوهج ببطاقات ذهبية وخضراء سريعة مع ظهور شعار "مليونير".
• التعليق الصوتي: "توقف عن إضاعة وقتك في عشرات التطبيقات المعقدة... هناك أداة واحدة مجانية تغير كل شيء!"

⏱️ [00:05 - 00:22] عرض القيمة والمميزات (Value):
• المشهد: استعراض سريع لواجهة ${target.name} على الموبايل واللابتوب.
• التعليق الصوتي: "مع ${target.name}، ستحصل على: ${target.features.join('، و')}. كل ذلك يعمل فوراً من متصفحك بدون تحميل ثقيل!"

⏱️ [00:22 - 00:${duration}] الدعوة لاتخاذ إجراء (Call To Action):
• المشهد: زر ذهبي متوهج مع رابط الموقع ${target.url}
• التعليق الصوتي: "اضغط على الرابط الآن وجرّب ${target.name} مجاناً على موقع مليونير!"`;

    const out = document.getElementById('mktVideoScriptOutput');
    if (out) out.value = scriptText;

    // Start live animated preview on Canvas
    startCanvasPromoPreview(target);
  }

  let previewAnimId = null;
  function startCanvasPromoPreview(target) {
    const canvas = document.getElementById('mktPromoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (previewAnimId) cancelAnimationFrame(previewAnimId);

    const w = canvas.width;
    const h = canvas.height;
    let tick = 0;

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 1,
      vy: -(Math.random() * 0.8 + 0.3),
      alpha: Math.random() * 0.5 + 0.2
    }));

    function drawFrame() {
      tick++;
      // Luxury dark gradient background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#050810');
      grad.addColorStop(0.5, '#0b1324');
      grad.addColorStop(1, '#061a14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Animated glow particles
      particles.forEach(p => {
        p.y += p.vy;
        if (p.y < 0) p.y = h;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();
      });

      // Top Badge
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 120, 45, 240, 38, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ منصة مليونير • MILLIONAIRE', w / 2, 70);

      // App Title (pulsing entrance)
      const pulse = 1 + Math.sin(tick * 0.05) * 0.02;
      ctx.save();
      ctx.translate(w / 2, 165);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(target.name.slice(0, 32), 0, 0);
      ctx.restore();

      // Feature cards cycling highlight
      const activeIdx = Math.floor(tick / 90) % target.features.length;
      target.features.forEach((feat, i) => {
        const y = 235 + i * 72;
        const isActive = i === activeIdx;
        ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = isActive ? '#10b981' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isActive ? 2.5 : 1;
        ctx.beginPath();
        ctx.roundRect(45, y, w - 90, 56, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isActive ? '#34d399' : '#e2e8f0';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText(`✅ ${feat.slice(0, 40)}`, w / 2, y + 34);
      });

      // Bottom CTA Pill
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 150, h - 95, 300, 48, 24);
      ctx.fill();

      ctx.fillStyle = '#050810';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('جرّبه مجاناً الآن 👇', w / 2, h - 65);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText(window.location.hostname || 'millionair.site', w / 2, h - 22);

      previewAnimId = requestAnimationFrame(drawFrame);
    }
    drawFrame();
  }

  function downloadPromoVideo() {
    const canvas = document.getElementById('mktPromoCanvas');
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return alert('متصفحك لا يدعم تسجيل الفيديو المباشر من Canvas. استخدم متصفح Chrome أو Edge أو Opera.');
    }

    const btn = document.getElementById('btnDownloadPromoVideo');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle text-rose-400 animate-ping"></i> <span>جارٍ تسجيل الفيديو (6 ثوانٍ)...</span>';
    }

    const target = getSelectedTarget();
    startCanvasPromoPreview(target);

    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `millionaire-promo-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> <span>توليد وتحميل الفيديو الإعلاني (.WebM)</span>';
      }
      alert('🎉 تم تجهيز وتحميل الفيديو الإعلاني بنجاح! يمكنك نشره مباشرة على TikTok و Reels و Shorts.');
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 6000);
  }

  window.AIMarketingStudio = {
    populateTargets: populateMarketingTargets,
    generatePost: generateTargetedPost,
    copyPost: copyTargetedPost,
    generateVideo: generatePromoVideoPackage,
    downloadVideo: downloadPromoVideo
  };
})();
