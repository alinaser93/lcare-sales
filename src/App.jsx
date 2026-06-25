import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Plus, Users, Wallet, Download, Upload, Copy, MessageCircle,
  Phone, MapPin, Calendar, TrendingUp, Bell, Check, X, Search, Trash2,
  Sparkles, AlertCircle, Clock, Package, Loader2, RefreshCw, FileText,
  ChevronLeft, ChevronRight, DollarSign, UserPlus, Zap, Edit3, Save,
  HardDrive, Shield, FileUp, Bot, Sparkle, ListChecks,
  Cloud, CloudOff, BarChart3, Award, AlertTriangle, Send, Megaphone, Target
} from 'lucide-react';

import { cloudEnabled, cloudLoad, cloudSave, cloudSubscribe } from './supabase';

// ================ Storage (cloud + local cache) ================
const STORAGE_KEY = 'lcare-sales-v1';

// يقرأ من السحابة أولاً (إن كانت مفعّلة)، ثم من الذاكرة المحلية كنسخة احتياطية.
async function loadFromStorage() {
  if (cloudEnabled) {
    const cloud = await cloudLoad();
    if (cloud && Array.isArray(cloud.sales)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud)); } catch (e) {}
      return cloud;
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { sales: [] };
}

// يحفظ محلياً فوراً (سريع) ثم في السحابة (مزامنة).
async function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Local save error:', e);
  }
  if (cloudEnabled) cloudSave(data);
  return true;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ================ Constants ================
// 🎥 ضع روابط الفيديوهات التعليمية لكل سنسر في videoUrl (من يوتيوب أو غيره)
const SENSOR_TYPES = {
  libre2:            { name: 'Libre 2',              duration: 14, reminderBefore: 2, defaultPrice: 95000,  color: 'bg-sky-100 text-sky-800 border-sky-200',       videoUrl: '' },
  libre3_plus:       { name: 'Libre 3 Plus',        duration: 15, reminderBefore: 2, defaultPrice: 125000, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', videoUrl: '' },
  sibionics_gs1:     { name: 'Sibionics GS1',        duration: 14, reminderBefore: 2, defaultPrice: 80000,  color: 'bg-emerald-100 text-teal-800 border-emerald-200', videoUrl: '' },
  sibionics_android: { name: 'Sibionics أندرويد',   duration: 25, reminderBefore: 2, defaultPrice: 65000,  color: 'bg-amber-100 text-amber-800 border-amber-200',   videoUrl: '' },
};

const PLATFORMS = {
  facebook:  { name: 'فيسبوك',    color: 'bg-blue-100 text-blue-700' },
  instagram: { name: 'انستغرام',  color: 'bg-pink-100 text-pink-700' },
  tiktok:    { name: 'تيك توك',   color: 'bg-zinc-900 text-white' },
};

// ⚙️ إعدادات المتجر — قابلة للتعديل من داخل التطبيق (تبويب تصدير ← إعدادات الرسائل)
const STORE_CONFIG = {
  website: 'https://Store.lcareiq.com',
  disclaimer: 'ملاحظة: المنتج يُباع كما هو وبدون ضمان. يُرجى اتباع الفيديو التعليمي بدقة، واستشارة طبيبك المختص لأي قرار يخص علاجك.',
};

// كائن حيّ يحمل الإعدادات الحالية (يُحدّث من التخزين عند الإقلاع)
const liveConfig = {
  website: STORE_CONFIG.website,
  disclaimer: STORE_CONFIG.disclaimer,
  videos: {
    libre2: 'https://store.lcareiq.com/#libre2',
    libre3_plus: 'https://store.lcareiq.com/#libre3',
    sibionics_gs1: 'https://store.lcareiq.com/#sibionics',
    sibionics_android: 'https://store.lcareiq.com/#sibionics',
  },
  // روابط تطبيق كل سنسر (لتحميله قبل التركيب)
  apps: {
    sibionics_gs1: 'https://guide.sibionics.com/cgm-app/',
    sibionics_android: 'https://guide.sibionics.com/cgm-app/',
  },
};
const DEFAULT_VIDEOS = {
  libre2: 'https://store.lcareiq.com/#libre2',
  libre3_plus: 'https://store.lcareiq.com/#libre3',
  sibionics_gs1: 'https://store.lcareiq.com/#sibionics',
  sibionics_android: 'https://store.lcareiq.com/#sibionics',
};
const getVideo = (type) => {
  const v = liveConfig.videos?.[type];
  if (v && String(v).trim()) return v;
  return DEFAULT_VIDEOS[type] || liveConfig.website;
};
const getAppUrl = (type) => liveConfig.apps?.[type] || '';


const DEFAULT_DELIVERY = 5000;
const COMMISSION_NEW = 2000;
const COMMISSION_RENEWAL = 3000;
const DELIVERY_PHONE = '+9647830040070'; // رقم المندوب الثابت

// ================ Utilities ================
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ar-IQ') + ' د.ع';

const normalizePhone = (raw) => {
  if (!raw) return '';
  let p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('00964')) p = '+964' + p.slice(5);
  else if (p.startsWith('964')) p = '+' + p;
  else if (p.startsWith('07')) p = '+964' + p.slice(1);
  else if (p.startsWith('7') && p.length === 10) p = '+964' + p;
  return p;
};
const waPhone = (p) => (p || '').replace(/[^\d]/g, '');

// ================ Extract via Claude Vision ================
const extractFromScreenshot = async (base64, mediaType) => {
  const prompt = `أنت مساعد متخصص باستخراج بيانات الطلبات من محادثات عربية (عراقية غالباً). استخرج من هذه الصورة البيانات وأرجعها كـ JSON نقي فقط بدون أي نص إضافي وبدون markdown fences.

الحقول المطلوبة:
{
  "name": "الاسم الكامل للزبون",
  "phone": "رقم الهاتف كما هو مكتوب",
  "address": "العنوان الكامل (المحافظة والمنطقة والتفاصيل)",
  "city": "المحافظة فقط (بغداد، البصرة، ...)",
  "sensorType": أحد هذه القيم: "libre2" أو "libre3_plus" أو "sibionics_gs1" أو "sibionics_android",
  "price": السعر بالدينار العراقي كرقم فقط,
  "deliveryFee": سعر التوصيل كرقم فقط (0 إذا لم يُذكر),
  "platform": أحد هذه القيم: "facebook" أو "instagram" أو "tiktok" (استنتج من سياق الصورة أو اجعلها null)
}

ملاحظات:
- "ليبري 2" أو "libre 2" أو "النسخة الذهبية" → libre2
- "ليبرا 3 بلص" أو "Libre 3 Plus" أو "الجيل الأحدث" → libre3_plus
- "سيبايونكس" بدون أندرويد → sibionics_gs1
- "سيبايونكس أندرويد" أو "٦٥" أو "65" → sibionics_android
- إذا لم تجد معلومة اجعلها null
- أرجع JSON فقط.`;

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });
  if (!response.ok) {
    const e = await response.text();
    throw new Error('AI error: ' + e);
  }
  const data = await response.json();
  const text = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(text);
};

// Extract ALL orders from a full WhatsApp chat export (chunked)
const extractOrdersFromChat = async (fullText, onProgress) => {
  // WhatsApp lines: "M/D/YY, H:MM AM/PM - Sender: text"
  // Order bodies span multiple continuation lines WITHOUT a timestamp prefix.
  // We stitch each message with its continuation lines, tagging the date,
  // so the model sees complete, dated order blocks.
  const rawLines = fullText.split('\n');
  const dateRe = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}\s*[APap]?\.?[Mm]?\.?\s*[-–]\s*/;
  const stitched = [];
  let current = null;
  let currentDate = '';
  for (const line of rawLines) {
    const m = line.match(dateRe);
    if (m) {
      if (current !== null) stitched.push({ date: currentDate, text: current });
      currentDate = m[1];
      current = line.replace(dateRe, '');
    } else {
      // continuation line of the previous message (e.g. order body)
      if (current !== null) current += '\n' + line;
      else current = line;
    }
  }
  if (current !== null) stitched.push({ date: currentDate, text: current });

  // Normalize date to YYYY-MM-DD (assume M/D/YY)
  const isoDate = (d) => {
    const p = (d || '').split('/');
    if (p.length !== 3) return '';
    let [mo, da, yr] = p;
    if (yr.length === 2) yr = '20' + yr;
    return `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  };

  // Keep ONLY blocks that look like customer orders (huge noise reduction + token savings)
  const orderBlocks = stitched
    .filter(s => /معلومات الزبون|تفاصيل الطلب|المادة المطلوبة|رقم الهاتف|سعر الجهاز/.test(s.text))
    .map(s => `[التاريخ: ${isoDate(s.date)}]\n${s.text.trim()}`);

  if (orderBlocks.length === 0) {
    const e = new Error('لم يتم التعرف على صيغة الطلبات في الملف');
    throw e;
  }

  // Chunk the order blocks. Keep chunks SMALL so the JSON response for each
  // chunk fits within the model's max output tokens (a chunk with too many
  // orders produces JSON that gets truncated and dropped). ~3500 chars ≈ 8-10 orders.
  const CHUNK = 3500;
  const chunks = [];
  let buf = '';
  for (const block of orderBlocks) {
    if (buf.length + block.length > CHUNK && buf.length > 0) {
      chunks.push(buf);
      buf = '';
    }
    buf += block + '\n\n---\n\n';
  }
  if (buf.trim()) chunks.push(buf);

  const sysPrompt = `أنت خبير في استخراج طلبات بيع مستشعرات السكر (CGM) من محادثات واتساب عراقية بين صيدلاني (Ali Nasser) ومورّده.

ستصلك "كتل طلبات" مفصولة بـ "---"، كل كتلة تبدأ بـ [التاريخ: YYYY-MM-DD] ثم نص الطلب. الصيغة الشائعة للطلب الفعلي:
معلومات الزبون:
الاسم: ...
رقم الهاتف: 07XXXXXXXXX
العنوان: ...
المادة المطلوبة:
النوع: ... - العدد (N).
سعر الجهاز: NNN دينار. (قد لا يُذكر)
أجور التوصيل: ... (قد تكون "مجاني")

استخرج كل طلب زبون يحتوي على الأقل اسم أو رقم هاتف، وأرجِع **مصفوفة JSON نقية فقط** (بدون أي شرح أو نص قبلها أو بعدها، وبدون علامات markdown):
[
  {
    "name": "اسم الزبون",
    "phone": "رقم الهاتف 07XXXXXXXXX",
    "address": "العنوان الكامل",
    "city": "المحافظة فقط",
    "sensorType": "libre2" أو "libre3_plus" أو "sibionics_gs1" أو "sibionics_android",
    "price": سعر القطعة الواحدة بالدينار كرقم (بدون التوصيل),
    "deliveryFee": أجور التوصيل كرقم (0 إذا "مجاني"),
    "saleDate": "YYYY-MM-DD من سطر [التاريخ]",
    "quantity": عدد القطع كرقم (1 افتراضياً)
  }
]

قواعد تحويل نوع الجهاز (مهمة جداً):
- "ليبرا 2" أو "ليبري" أو "Libre 2" أو "النسخة الذهبية" أو "أبو الـ 95" → "libre2"
- "ليبرا 3 بلص" أو "Libre 3 Plus" أو "أبو الـ 125" أو "الجيل الأحدث" → "libre3_plus"
- "سيبايونكس" أو "Sibionics" أو "شرق اوسط" أو "أبو الـ 80" أو "أبو الـ 85" → "sibionics_gs1"
- "اسيوي" أو "اندرويد" أو "أبو الـ 65" أو "أبو الـ 60" → "sibionics_android"
- عبارة "أبو الـ X ألف" تشير للسعر: استعملها لتحديد النوع والسعر معاً (مثلاً "أبو الـ 85 ألف" = sibionics_gs1 بسعر 85000).

قواعد أخرى:
- السعر: إذا ذُكر "سعر الجهاز" استعمله؛ إن لم يُذكر استنتجه من "أبو الـ X ألف"؛ "العدد (2)" يعني quantity=2 و price سعر القطعة الواحدة.
- إذا قال صراحة "لغى/ألغى/رفض الطلب" تجاهله. إذا كان "تعديل" لطلب سابق لنفس الرقم، أدرِج النسخة الأحدث فقط.
- لا تُدرج الرسائل التي ليست طلبات (تحايا، أسئلة عامة، صور).
- إن لم تجد أي طلب في هذا الجزء أرجِع [] فقط.

أرجِع JSON فقط — يبدأ بـ [ وينتهي بـ ].`;

  let allOrders = [];
  let okChunks = 0;
  const errors = [];
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 4000,
          messages: [{ role: 'user', content: `${sysPrompt}\n\n=== جزء المحادثة ===\n${chunks[i]}` }]
        })
      });
      const raw = await response.text();
      if (!response.ok) {
        errors.push(`HTTP ${response.status}: ${raw.slice(0, 300)}`);
        continue;
      }
      let data;
      try { data = JSON.parse(raw); } catch { errors.push('رد غير صالح من الخادم'); continue; }
      if (data.error) { errors.push(typeof data.error === 'string' ? data.error : JSON.stringify(data.error).slice(0, 300)); continue; }
      okChunks++;
      let text = (data.content || []).map(b => b.text || '').join('').trim();
      text = text.replace(/```json|```/g, '').trim();
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      let added = false;
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const parsed = JSON.parse(text.slice(start, end + 1));
          if (Array.isArray(parsed)) { allOrders = allOrders.concat(parsed); added = true; }
        } catch (pe) { /* fall through to object-by-object recovery */ }
      }
      if (!added) {
        // Recover individual complete {...} objects (handles truncated/!valid arrays)
        const objs = text.match(/\{[^{}]*\}/g) || [];
        for (const o of objs) {
          try {
            const parsed = JSON.parse(o);
            if (parsed && (parsed.phone || parsed.name)) allOrders.push(parsed);
          } catch (oe) { /* skip */ }
        }
      }
    } catch (e) {
      errors.push(e.message || String(e));
    }
  }

  // If every chunk failed at the network/API level, surface the reason
  if (okChunks === 0 && errors.length > 0) {
    const err = new Error(errors[0]);
    err.allErrors = errors;
    throw err;
  }

  // Dedup by phone+date+sensor, keeping the last occurrence (latest edit)
  const map = new Map();
  for (const o of allOrders) {
    if (!o || !o.phone) continue;
    const key = String(o.phone).replace(/\D/g, '') + '|' + (o.saleDate || '') + '|' + (o.sensorType || '');
    map.set(key, o);
  }
  return Array.from(map.values());
};

// ================ Message Generators ================
const genCustomerMsg = (sale) => {
  const s = SENSOR_TYPES[sale.sensorType];
  const isFreeDelivery = !sale.deliveryFee || Number(sale.deliveryFee) === 0;
  const total = (Number(sale.price) || 0) + (Number(sale.deliveryFee) || 0);
  const link = getVideo(sale.sensorType) || liveConfig.website;
  const appUrl = getAppUrl(sale.sensorType);
  const appLine = appUrl ? `\n📲 أولاً، حمّل تطبيق الجهاز من هنا قبل التركيب:\n${appUrl}\n` : '';
  return `مرحباً ${sale.customerName} 👋
تم تأكيد طلبكم من LCare ✅

🔹 المنتج: ${s?.name || '---'}
🔹 الإجمالي: ${fmtMoney(total)}${isFreeDelivery ? ' (توصيل مجاني 🎁)' : ''}
🔹 العنوان: ${sale.customerAddress}

🚚 سيصل الطلب خلال ٢٤-٤٨ ساعة.
${appLine}
📺 طريقة التركيب (مهم جداً):
لضمان نجاح التركيب وعدم خسارة الجهاز، يُرجى الدخول للرابط التالي والنزول لأسفل الصفحة لمشاهدة (فيديو شرح التركيب) قبل فتح العلبة:
${link}

⚠️ بدون ضمان: هذا الحساس لا يشمل أي ضمان صيانة أو استبدال — راجع فيديو التركيب في الرابط أعلاه لضمان التركيب الصحيح.

📅 ينتهي السنسر بتاريخ ${fmtDate(sale.expiryDate)} — وسنذكّرك قبلها للتجديد.

شكراً لثقتكم 💚 LCare`;
};

// رسالة ترحيب لزبائن السوشال ميديا (بعد الشراء من انستا/تيكتوك/فيسبوك)
const genWelcomeMsg = (sale) => {
  const s = SENSOR_TYPES[sale.sensorType];
  const link = getVideo(sale.sensorType) || liveConfig.website;
  const appUrl = getAppUrl(sale.sensorType);
  const appLine = appUrl ? `\n📲 أولاً، حمّل تطبيق الجهاز من هنا قبل التركيب:\n${appUrl}\n` : '';
  return `مرحباً ${sale.customerName || ''} 👋
شكراً لطلبكم جهاز (${s?.name || 'السنسر'}) من LCare 💚
${appLine}
📺 طريقة التركيب (مهم جداً):
لضمان نجاح التركيب وعدم خسارة الجهاز، يُرجى الدخول للرابط التالي والنزول لأسفل الصفحة لمشاهدة (فيديو شرح التركيب) قبل فتح العلبة:
${link}

⚠️ بدون ضمان: هذا الحساس لا يشمل أي ضمان صيانة أو استبدال — راجع فيديو التركيب في الرابط أعلاه لضمان التركيب الصحيح.

🛒 للتجديد أو الطلب مستقبلاً مباشرةً من متجرنا:
${liveConfig.website}

شكراً لثقتكم 💚 LCare`;
};


const genDeliveryMsg = (sale) => {
  const s = SENSOR_TYPES[sale.sensorType];
  const isFreeDelivery = !sale.deliveryFee || Number(sale.deliveryFee) === 0;
  const total = (Number(sale.price) || 0) + (Number(sale.deliveryFee) || 0);
  return `📦 طلب جديد - LCare
━━━━━━━━━━━━━━
👤 الزبون: ${sale.customerName}
📱 الهاتف: ${sale.customerPhone}
📍 العنوان: ${sale.customerAddress}
🧊 المنتج: ${s?.name || '---'}
💰 المبلغ المستلَم من الزبون: ${fmtMoney(total)}
   ${isFreeDelivery ? '(التوصيل مجاني 🎁)' : `(منه ${fmtMoney(sale.deliveryFee)} توصيل)`}
━━━━━━━━━━━━━━`;
};

const genReminderMsg = (sale) => {
  const s = SENSOR_TYPES[sale.sensorType];
  return `مرحباً ${sale.customerName} 👋
من LCare - نذكّرك بأن سنسر (${s?.name}) الخاص بك ينتهي بعد يومين (${fmtDate(sale.expiryDate)}).

هل تودّ حجز السنسر الجديد الآن؟ 💚
رد علينا بـ "نعم" وسنرتّب لك الطلب فوراً.`;
};

// ================ Main App ================
export default function LCareSalesApp() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [storeSettings, setStoreSettings] = useState({ website: liveConfig.website, disclaimer: liveConfig.disclaimer, videos: { ...liveConfig.videos } });
  const [toast, setToast] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      const data = await loadFromStorage();
      setSales(data.sales || []);
      // حمّل الإعدادات (الموقع، الفيديوهات، إخلاء المسؤولية) إن وُجدت
      if (data.config) {
        if (data.config.website) liveConfig.website = data.config.website;
        if (data.config.disclaimer) liveConfig.disclaimer = data.config.disclaimer;
        if (data.config.videos) {
          // ادمج فقط القيم غير الفارغة حتى لا تطغى إعدادات قديمة فارغة على الروابط الصحيحة
          const merged = { ...liveConfig.videos };
          for (const [k, v] of Object.entries(data.config.videos)) {
            if (v && String(v).trim()) merged[k] = v;
          }
          liveConfig.videos = merged;
        }
        setStoreSettings({ website: liveConfig.website, disclaimer: liveConfig.disclaimer, videos: { ...liveConfig.videos } });
      }
    } catch (err) {
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper to update sales and persist (config rides along so cloud keeps both)
  const persistSales = async (newSales) => {
    setSales(newSales);
    await saveToStorage({ sales: newSales, config: {
      website: liveConfig.website,
      disclaimer: liveConfig.disclaimer,
      videos: liveConfig.videos,
    }});
  };

  // حفظ إعدادات الرسائل (الموقع، إخلاء المسؤولية، روابط الفيديو)
  const saveSettings = async (next) => {
    liveConfig.website = next.website;
    liveConfig.disclaimer = next.disclaimer;
    liveConfig.videos = { ...next.videos };
    setStoreSettings({ website: next.website, disclaimer: next.disclaimer, videos: { ...next.videos } });
    await saveToStorage({ sales, config: {
      website: liveConfig.website,
      disclaimer: liveConfig.disclaimer,
      videos: liveConfig.videos,
    }});
    showToast('تم حفظ الإعدادات ✓');
  };

  useEffect(() => {
    loadData();
  }, []);

  // مزامنة حيّة: عند تعديل جهاز آخر للبيانات، حدّث هذا الجهاز تلقائياً
  useEffect(() => {
    if (!cloudEnabled) return;
    const unsub = cloudSubscribe((incoming) => {
      if (incoming && Array.isArray(incoming.sales)) {
        setSales(incoming.sales);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming)); } catch (e) {}
      }
    });
    return unsub;
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Derive customers from sales (grouped by phone)
  const customers = useMemo(() => {
    const map = new Map();
    for (const sale of sales) {
      const key = sale.customerPhone;
      if (!key) continue;
      let c = map.get(key);
      if (!c) {
        c = {
          id: key,
          name: sale.customerName,
          phone: sale.customerPhone,
          address: sale.customerAddress,
          city: sale.city,
          platform: sale.platform,
          firstPurchase: sale.saleDate,
          lastPurchase: sale.saleDate,
          lastSensorType: sale.sensorType,
          totalPurchases: 0,
        };
        map.set(key, c);
      }
      c.totalPurchases++;
      if (sale.saleDate < c.firstPurchase) c.firstPurchase = sale.saleDate;
      if (sale.saleDate >= c.lastPurchase) {
        c.lastPurchase = sale.saleDate;
        c.lastSensorType = sale.sensorType;
        // Most recent sale has latest customer info
        c.name = sale.customerName;
        c.address = sale.customerAddress;
        c.city = sale.city;
        c.platform = sale.platform;
      }
    }
    return Array.from(map.values());
  }, [sales]);

  // ============ CRUD ============
  const addSale = async (data) => {
    const saleDate = todayISO();
    const sensor = SENSOR_TYPES[data.sensorType];
    const expiryDate = addDays(saleDate, sensor.duration);
    const reminderDate = addDays(expiryDate, -sensor.reminderBefore);
    const phone = normalizePhone(data.customerPhone);

    const existingCustomer = sales.find(s => s.customerPhone === phone);
    const isRenewal = !!existingCustomer;
    const commissionAmount = isRenewal ? COMMISSION_RENEWAL : COMMISSION_NEW;

    // Allow 0 as explicit delivery fee value (e.g., "free delivery")
    const deliveryFeeNum = data.deliveryFee === '' || data.deliveryFee == null
      ? DEFAULT_DELIVERY
      : Number(data.deliveryFee);

    const newSale = {
      id: uid(),
      customerId: phone,
      customerName: data.customerName,
      customerPhone: phone,
      customerAddress: data.customerAddress,
      city: data.city || '',
      sensorType: data.sensorType,
      price: Number(data.price) || 0,
      deliveryFee: isNaN(deliveryFeeNum) ? DEFAULT_DELIVERY : deliveryFeeNum,
      platform: data.platform || 'facebook',
      saleDate,
      expiryDate,
      reminderDate,
      isRenewal,
      status: 'active',
      commissionAmount,
      commissionType: isRenewal ? 'renewal' : 'new',
      createdAt: new Date().toISOString(),
    };

    // Mark old active sales for this customer as renewed
    const updatedExisting = isRenewal
      ? sales.map(s =>
          s.customerPhone === phone && s.status === 'active'
            ? { ...s, status: 'renewed' }
            : s)
      : sales;

    const newSales = [newSale, ...updatedExisting];
    await persistSales(newSales);

    showToast(isRenewal
      ? `تم تسجيل التجديد • عمولة مريم ${fmtMoney(COMMISSION_RENEWAL)}`
      : `تم تسجيل البيع • عمولة مريم ${fmtMoney(COMMISSION_NEW)}`);
    return newSale;
  };

  const deleteSale = (id) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    setPendingConfirm({
      title: 'حذف المبيعة',
      message: `حذف مبيعة ${sale.customerName} بتاريخ ${fmtDate(sale.saleDate)}؟\nلا يمكن التراجع عن هذا الإجراء.`,
      variant: 'danger',
      confirmLabel: 'حذف',
      action: async () => {
        const newSales = sales.filter(s => s.id !== id);
        await persistSales(newSales);
        showToast('تم الحذف');
      },
    });
  };

  const updateSale = async (id, updates) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const updated = { ...sale, ...updates };
    if (updates.sensorType !== undefined || updates.saleDate !== undefined) {
      const sensor = SENSOR_TYPES[updated.sensorType];
      updated.expiryDate = addDays(updated.saleDate, sensor.duration);
      updated.reminderDate = addDays(updated.expiryDate, -sensor.reminderBefore);
    }
    if (updates.isRenewal !== undefined) {
      updated.commissionAmount = updates.isRenewal ? COMMISSION_RENEWAL : COMMISSION_NEW;
      updated.commissionType = updates.isRenewal ? 'renewal' : 'new';
    }

    const newSales = sales.map(s => s.id === id ? updated : s);
    await persistSales(newSales);
    showToast('تم تحديث المبيعة');
  };

  // تجديد سريع من شاشة التذكير: ينشئ بيعاً جديداً بنفس تفاصيل الزبون
  const quickRenew = async (oldSaleId) => {
    const old = sales.find(s => s.id === oldSaleId);
    if (!old) return;
    const saleDate = todayISO();
    const sensor = SENSOR_TYPES[old.sensorType] || SENSOR_TYPES.libre2;
    const expiryDate = addDays(saleDate, sensor.duration);
    const reminderDate = addDays(expiryDate, -sensor.reminderBefore);

    const newSale = {
      ...old,
      id: uid(),
      saleDate,
      expiryDate,
      reminderDate,
      isRenewal: true,
      status: 'active',
      commissionAmount: COMMISSION_RENEWAL,
      commissionType: 'renewal',
      reminderOutcome: undefined,
      reminderReason: undefined,
      createdAt: new Date().toISOString(),
    };
    // علّم كل المبيعات النشطة لهذا الزبون كمُجدّدة
    const updated = sales.map(s =>
      s.customerPhone === old.customerPhone && s.status === 'active'
        ? { ...s, status: 'renewed' }
        : s);
    await persistSales([newSale, ...updated]);
    showToast(`✅ تم التجديد • عمولة مريم ${fmtMoney(COMMISSION_RENEWAL)}`);
  };

  // تسجيل نتيجة التذكير (بانتظار الرد / لم يجدد + السبب)
  const setReminderOutcome = async (saleId, outcome, reason = '') => {
    const newSales = sales.map(s =>
      s.id === saleId ? { ...s, reminderOutcome: outcome, reminderReason: reason } : s);
    await persistSales(newSales);
    if (outcome === 'not_renewed') showToast('تم تسجيل السبب');
    else if (outcome === 'pending_reply') showToast('تم وضع علامة: بانتظار الرد');
    else showToast('تم التحديث');
  };

  const updateCustomer = async (phoneKey, updates) => {
    const cleanUpdates = { ...updates };
    if (updates.phone) cleanUpdates.phone = normalizePhone(updates.phone);

    const newSales = sales.map(s => {
      if (s.customerPhone !== phoneKey) return s;
      return {
        ...s,
        customerName:    cleanUpdates.name     !== undefined ? cleanUpdates.name     : s.customerName,
        customerPhone:   cleanUpdates.phone    !== undefined ? cleanUpdates.phone    : s.customerPhone,
        customerAddress: cleanUpdates.address  !== undefined ? cleanUpdates.address  : s.customerAddress,
        city:            cleanUpdates.city     !== undefined ? cleanUpdates.city     : s.city,
        platform:        cleanUpdates.platform !== undefined ? cleanUpdates.platform : s.platform,
        customerId:      cleanUpdates.phone    !== undefined ? cleanUpdates.phone    : s.customerId,
      };
    });
    await persistSales(newSales);
    showToast('تم تحديث بيانات الزبون');
  };

  const deleteCustomer = (phoneKey) => {
    const customer = customers.find(c => c.id === phoneKey);
    if (!customer) return;
    const customerSales = sales.filter(s => s.customerPhone === phoneKey);
    setPendingConfirm({
      title: 'حذف الزبون',
      message: `حذف ${customer.name} وجميع مبيعاته (${customerSales.length} مبيعة)؟\nلا يمكن التراجع عن هذا الإجراء.`,
      variant: 'danger',
      confirmLabel: 'حذف نهائياً',
      action: async () => {
        const newSales = sales.filter(s => s.customerPhone !== phoneKey);
        await persistSales(newSales);
        showToast('تم حذف الزبون');
      },
    });
  };

  // Restore a full backup (replaces all data)
  const restoreBackup = async (backupSales) => {
    await persistSales(backupSales);
    showToast(`تم استرجاع ${backupSales.length} مبيعة بنجاح`);
  };

  // إزالة المبيعات المكررة (نفس الرقم + نفس التاريخ + نفس السنسر)
  const dedupSales = () => {
    const seen = new Set();
    const unique = [];
    let removed = 0;
    // نمر من الأحدث للأقدم حتى نُبقي الأحدث إنشاءً
    const sorted = [...sales].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    for (const s of sorted) {
      const key = s.customerPhone + '|' + s.saleDate + '|' + s.sensorType;
      if (seen.has(key)) { removed++; continue; }
      seen.add(key);
      unique.push(s);
    }
    if (removed === 0) { showToast('لا توجد تكرارات 👍'); return; }
    setPendingConfirm({
      title: 'تنظيف التكرارات',
      message: `تم العثور على ${removed} مبيعة مكررة (نفس الرقم والتاريخ والسنسر).\nسيتم حذفها والإبقاء على نسخة واحدة من كل مبيعة.`,
      variant: 'danger',
      confirmLabel: `حذف ${removed} تكرار`,
      action: async () => {
        // أعد الترتيب للأصل (الأحدث أولاً بتاريخ الإنشاء)
        await persistSales(unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        showToast(`✨ تم حذف ${removed} مبيعة مكررة`);
      },
    });
  };

  // Bulk import orders extracted by AI from a WhatsApp chat
  const bulkImportSales = async (orders) => {
    // Build new sale objects from extracted orders
    const existingPhones = new Set(sales.map(s => s.customerPhone));
    const seenInBatch = new Set();
    const toAdd = [];

    for (const o of orders) {
      const phone = normalizePhone(o.phone);
      if (!phone) continue;
      const sensorType = o.sensorType && SENSOR_TYPES[o.sensorType] ? o.sensorType : 'libre2';
      const sensor = SENSOR_TYPES[sensorType];
      const saleDate = o.saleDate || todayISO();
      const dedupKey = phone + '|' + saleDate;
      // Skip exact duplicates within this batch
      if (seenInBatch.has(dedupKey)) continue;
      seenInBatch.add(dedupKey);

      const expiryDate = addDays(saleDate, sensor.duration);
      const reminderDate = addDays(expiryDate, -sensor.reminderBefore);
      // Renewal if this phone already existed before import
      const isRenewal = existingPhones.has(phone);
      existingPhones.add(phone);

      const price = (o.price && Number(o.price) > 0) ? Number(o.price) : sensor.defaultPrice;
      const deliveryFee = (o.deliveryFee !== null && o.deliveryFee !== undefined && o.deliveryFee !== '')
        ? Number(o.deliveryFee) : DEFAULT_DELIVERY;

      toAdd.push({
        id: uid(),
        customerId: phone,
        customerName: o.name || 'بدون اسم',
        customerPhone: phone,
        customerAddress: o.address || '',
        city: o.city || '',
        sensorType,
        price,
        deliveryFee,
        platform: o.platform || 'facebook',
        saleDate,
        expiryDate,
        reminderDate,
        isRenewal,
        status: 'active',
        commissionAmount: isRenewal ? COMMISSION_RENEWAL : COMMISSION_NEW,
        commissionType: isRenewal ? 'renewal' : 'new',
        createdAt: new Date().toISOString(),
        importedFromChat: true,
      });
    }

    if (toAdd.length === 0) {
      showToast('لم يتم العثور على طلبات جديدة', 'error');
      return 0;
    }

    // Newest first
    const merged = [...toAdd.reverse(), ...sales];
    await persistSales(merged);
    showToast(`تم استيراد ${toAdd.length} طلب بنجاح ✨`);
    return toAdd.length;
  };

  // ============ Derived ============
  const stats = useMemo(() => {
    const thisMonth = todayISO().slice(0, 7);
    const monthSales = sales.filter(s => s.saleDate?.startsWith(thisMonth));
    const todaySales = sales.filter(s => s.saleDate === todayISO());
    const monthRevenue = monthSales.reduce((a, s) => a + s.price + s.deliveryFee, 0);
    const monthCommissions = monthSales.reduce((a, s) => a + s.commissionAmount, 0);
    return {
      today: todaySales.length,
      month: monthSales.length,
      total: sales.length,
      customers: customers.length,
      monthRevenue,
      monthCommissions,
    };
  }, [sales, customers]);

  // قائمة الزبائن المحتاجين تجديد، مقسّمة لقسمين
  const { dueReminders, overdueReminders } = useMemo(() => {
    const today = todayISO();
    // أحدث تاريخ شراء لكل رقم هاتف (لمعرفة إن كان الزبون قد جدّد بعد ذلك)
    const latestByPhone = {};
    for (const s of sales) {
      const p = s.customerPhone;
      if (!latestByPhone[p] || s.saleDate > latestByPhone[p]) latestByPhone[p] = s.saleDate;
    }
    const eligible = sales.filter(s => {
      if (s.status !== 'active') return false;
      if (s.reminderOutcome === 'not_renewed') return false; // عولج بسبب
      if (latestByPhone[s.customerPhone] && latestByPhone[s.customerPhone] > s.saleDate) return false; // جدّد
      const overdueDays = daysBetween(s.expiryDate, today);
      return s.reminderDate <= today && overdueDays <= 30; // ضمن النافذة أو متأخر حتى ٣٠ يوم
    });

    const due = eligible
      .filter(s => s.expiryDate >= today) // لم ينتهِ بعد (ينتهي خلال يومين)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const overdue = eligible
      .filter(s => s.expiryDate < today) // انتهى فعلاً
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    return { dueReminders: due, overdueReminders: overdue };
  }, [sales]);

  // إجمالي المحتاجين تجديد (للنسخ الجماعي والعدّاد)
  const todayReminders = useMemo(() => [...dueReminders, ...overdueReminders], [dueReminders, overdueReminders]);
  const overdueCount = overdueReminders.length;

  // ============ تحليلات شاملة ============
  const analytics = useMemo(() => {
    // المحافظات
    const byCity = {};
    const bySensor = {};
    const byMonth = {};
    for (const s of sales) {
      const city = (s.city || 'غير محدد').trim() || 'غير محدد';
      byCity[city] = (byCity[city] || 0) + 1;
      const sn = SENSOR_TYPES[s.sensorType]?.name || s.sensorType;
      bySensor[sn] = (bySensor[sn] || 0) + 1;
      const mo = (s.saleDate || '').slice(0, 7);
      if (mo) {
        if (!byMonth[mo]) byMonth[mo] = { count: 0, revenue: 0 };
        byMonth[mo].count++;
        byMonth[mo].revenue += (s.price || 0) + (s.deliveryFee || 0);
      }
    }
    const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
    const topSensors = Object.entries(bySensor).sort((a, b) => b[1] - a[1]);
    const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));

    // معدل التجديد: نسبة الزبائن الذين اشتروا أكثر من مرة
    const purchasesByPhone = {};
    for (const s of sales) purchasesByPhone[s.customerPhone] = (purchasesByPhone[s.customerPhone] || 0) + 1;
    const totalCust = Object.keys(purchasesByPhone).length;
    const repeatCust = Object.values(purchasesByPhone).filter(n => n > 1).length;
    const renewalRate = totalCust ? Math.round((repeatCust / totalCust) * 100) : 0;

    // أفضل الزبائن (الأكثر شراءً)
    const custInfo = {};
    for (const s of sales) {
      const p = s.customerPhone;
      if (!custInfo[p]) custInfo[p] = { phone: p, name: s.customerName, count: 0, revenue: 0, lastDate: s.saleDate };
      custInfo[p].count++;
      custInfo[p].revenue += (s.price || 0) + (s.deliveryFee || 0);
      if (s.saleDate > custInfo[p].lastDate) { custInfo[p].lastDate = s.saleDate; custInfo[p].name = s.customerName; }
    }
    const topCustomers = Object.values(custInfo).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 10);

    // زبائن في خطر: اشتروا مرة واحدة وانتهى سنسرهم منذ أكثر من ٣٠ يوماً ولم يعودوا
    const today = todayISO();
    const atRisk = Object.values(custInfo)
      .filter(c => {
        if (c.count > 1) return false; // عاد واشترى
        // آخر مبيعة لهذا الزبون
        const lastSale = sales.find(s => s.customerPhone === c.phone);
        if (!lastSale) return false;
        const overdue = daysBetween(lastSale.expiryDate, today);
        return overdue > 30 && overdue <= 180; // متأخر بين شهر و٦ أشهر
      })
      .sort((a, b) => a.lastDate.localeCompare(b.lastDate))
      .slice(0, 20);

    const totalRevenue = sales.reduce((a, s) => a + (s.price || 0) + (s.deliveryFee || 0), 0);

    // تحليل أيام الأسبوع (متى يشتري الزبائن أكثر)
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    for (const s of sales) {
      if (!s.saleDate) continue;
      const d = new Date(s.saleDate).getDay();
      if (!isNaN(d)) byDay[d]++;
    }
    const daysOfWeek = dayNames.map((name, i) => ({ name, count: byDay[i] }));
    const bestDay = daysOfWeek.reduce((a, b) => b.count > a.count ? b : a, daysOfWeek[0]);

    // أفضل شهر
    const bestMonth = months.length ? months.reduce((a, b) => b[1].count > a[1].count ? b : a, months[0]) : null;

    // متوسط قيمة الزبون
    const avgCustomerValue = totalCust ? Math.round(totalRevenue / totalCust) : 0;

    return { topCities, topSensors, months, renewalRate, repeatCust, totalCust, topCustomers, atRisk, totalRevenue, daysOfWeek, bestDay, bestMonth, avgCustomerValue };
  }, [sales]);

  // نسخ قائمة بكل الزبائن المحتاجين تجديد (للمتابعة الجماعية)
  const copyReminderList = async () => {
    if (todayReminders.length === 0) { showToast('لا يوجد زبائن للتذكير'); return; }
    const lines = todayReminders.map((s, i) => {
      const d = daysBetween(todayISO(), s.expiryDate);
      const status = d > 0 ? `ينتهي خلال ${d} يوم` : d === 0 ? 'ينتهي اليوم' : `متأخر ${Math.abs(d)} يوم`;
      return `${i + 1}. ${s.customerName} - ${s.customerPhone} - ${SENSOR_TYPES[s.sensorType]?.name} (${status})`;
    });
    const text = `📋 زبائن بحاجة للتجديد (${todayReminders.length}):\n\n${lines.join('\n')}`;
    try { await navigator.clipboard.writeText(text); showToast(`تم نسخ قائمة ${todayReminders.length} زبون 📋`); }
    catch (e) { showToast('تعذّر النسخ', 'error'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-cairo">جاري تحميل البيانات...</p>
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          .font-cairo { font-family: 'Cairo', sans-serif; }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          .font-cairo { font-family: 'Cairo', sans-serif; }
        `}</style>
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="font-bold text-lg mb-2">فشل تحميل البيانات</h2>
          <p className="text-xs text-slate-500 mb-4 break-words bg-slate-50 p-3 rounded-lg" dir="ltr">
            {error}
          </p>
          <button onClick={() => { setLoading(true); loadData(); }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen relative font-cairo text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; font-feature-settings: 'ss01'; }
        * { -webkit-tap-highlight-color: transparent; }

        :root {
          --brand-50:  #f0fdfa;
          --brand-100: #ccfbf1;
          --brand-500: #14b8a6;
          --brand-600: #0d9488;
          --brand-700: #0f766e;
          --ink:       #0f172a;
        }

        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin 1.6s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }

        /* Cohesive, premium background — single brand family, very subtle */
        .app-bg {
          background:
            radial-gradient(1200px 600px at 100% -5%, rgba(20, 184, 166, 0.10) 0%, transparent 55%),
            radial-gradient(900px 500px at -10% 105%, rgba(13, 148, 136, 0.07) 0%, transparent 55%),
            linear-gradient(180deg, #fbfdfc 0%, #f4f7f6 100%);
          min-height: 100vh;
        }

        /* Refined elevation system — the key to a premium feel */
        .elev-1 { box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); }
        .elev-2 { box-shadow: 0 2px 8px -2px rgba(15,23,42,0.06), 0 4px 16px -4px rgba(15,23,42,0.05); }
        .elev-3 { box-shadow: 0 8px 30px -6px rgba(15,23,42,0.10), 0 4px 12px -4px rgba(15,23,42,0.06); }
        .shadow-brand { box-shadow: 0 8px 24px -6px rgba(13,148,136,0.42), 0 2px 8px -2px rgba(13,148,136,0.28); }

        /* Legacy aliases kept cohesive (all map to brand now) */
        .glow-emerald, .glow-cyan { box-shadow: 0 8px 24px -6px rgba(13,148,136,0.42), 0 2px 8px -2px rgba(13,148,136,0.28); }
        .glow-pink   { box-shadow: 0 8px 24px -6px rgba(244,63,94,0.40); }
        .glow-violet { box-shadow: 0 8px 24px -6px rgba(124,58,237,0.40); }
        .glow-amber  { box-shadow: 0 8px 24px -6px rgba(217,119,6,0.40); }
        .card-soft   { box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); }

        .brand-grad { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%); }
      `}</style>
      <div className="app-bg fixed inset-0 -z-10" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/70 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl brand-grad flex items-center justify-center shadow-brand">
              <span className="text-white font-black text-xl">L</span>
            </div>
            <div>
              <h1 className="font-extrabold text-[17px] leading-tight flex items-center gap-2 text-slate-900">
                LCare
                {cloudEnabled ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-semibold">
                    <Cloud className="w-2.5 h-2.5" />مُزامَن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                    <HardDrive className="w-2.5 h-2.5" />محلي
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 font-medium">إدارة مبيعات مستشعرات السكر</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition"
              title="تحديث">
              <RefreshCw className={`w-[18px] h-[18px] text-slate-500 ${refreshing ? 'animate-spin-slow' : ''}`} />
            </button>
            {todayReminders.length > 0 && (
              <button onClick={() => setTab('dashboard')} className="relative p-2.5 rounded-xl hover:bg-slate-100 transition">
                <Bell className="w-[18px] h-[18px] text-slate-500" />
                <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 brand-grad text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-brand">
                  {todayReminders.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop tabs */}
        <nav className="hidden md:flex max-w-6xl mx-auto px-4 gap-1 border-t border-slate-100">
          {[
            { id: 'dashboard',   label: 'الرئيسية',     icon: LayoutDashboard },
            { id: 'new',         label: 'بيع جديد',     icon: Plus },
            { id: 'customers',   label: 'الزبائن',       icon: Users },
            { id: 'analytics',   label: 'تحليلات',       icon: BarChart3 },
            { id: 'ads',         label: 'إعلانات',       icon: Megaphone },
            { id: 'commissions', label: 'عمولات مريم',  icon: Wallet },
            { id: 'import',      label: 'استيراد محادثة', icon: Bot },
            { id: 'export',      label: 'تصدير',        icon: Download },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {tab === 'dashboard'   && <Dashboard stats={stats} dueReminders={dueReminders} overdueReminders={overdueReminders} sales={sales} onTab={setTab} onRenew={quickRenew} onOutcome={setReminderOutcome} onCopyList={copyReminderList} />}
        {tab === 'analytics'   && <Analytics analytics={analytics} stats={stats} onRenewCustomer={null} />}
        {tab === 'ads'         && <AdsView analytics={analytics} customers={customers} sales={sales} showToast={showToast} />}
        {tab === 'new'         && <NewSale onSave={addSale} showToast={showToast} />}
        {tab === 'customers'   && <CustomersList customers={customers} sales={sales} onDeleteSale={deleteSale} onUpdateCustomer={updateCustomer} onUpdateSale={updateSale} onDeleteCustomer={deleteCustomer} />}
        {tab === 'commissions' && <Commissions sales={sales} />}
        {tab === 'export'      && <ExportView customers={customers} sales={sales} onRestore={restoreBackup} showToast={showToast} setPendingConfirm={setPendingConfirm} onDedup={dedupSales} storeSettings={storeSettings} onSaveSettings={saveSettings} />}
        {tab === 'import'      && <ChatImporter onImport={bulkImportSales} setPendingConfirm={setPendingConfirm} existingCount={sales.length} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/70 z-20 pb-safe elev-3">
        <div className="grid grid-cols-6 px-0.5 pt-1">
          {[
            { id: 'dashboard',   label: 'الرئيسية',  icon: LayoutDashboard },
            { id: 'new',         label: 'بيع',       icon: Plus },
            { id: 'customers',   label: 'الزبائن',    icon: Users },
            { id: 'commissions', label: 'عمولات',    icon: Wallet },
            { id: 'import',      label: 'استيراد',   icon: Bot },
            { id: 'export',      label: 'تصدير',     icon: Download },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative py-2 flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${active ? 'text-teal-700' : 'text-slate-400'}`}>
                <span className={`flex items-center justify-center w-9 h-7 rounded-full transition-all duration-300 ${active ? 'bg-teal-50' : ''}`}>
                  <t.icon className="w-[17px] h-[17px]" strokeWidth={active ? 2.5 : 2} />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-1/2 translate-x-1/2 md:right-4 md:translate-x-0 z-30 animate-slide-up">
          <div className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-bold max-w-xs ${toast.type === 'error' ? 'bg-gradient-to-l from-rose-600 to-red-600 text-white shadow-rose-500/40' : 'bg-gradient-to-l from-teal-600 to-emerald-600 text-white shadow-emerald-500/40'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {pendingConfirm && (
        <ConfirmDialog
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          variant={pendingConfirm.variant}
          confirmLabel={pendingConfirm.confirmLabel}
          onConfirm={async () => {
            const action = pendingConfirm.action;
            setPendingConfirm(null);
            if (action) await action();
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  );
}

// ================ Dashboard ================
function Dashboard({ stats, dueReminders, overdueReminders, sales, onTab, onRenew, onOutcome, onCopyList }) {
  const recentSales = [...sales].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  const [showOverdue, setShowOverdue] = React.useState(false);
  const overdueCount = overdueReminders.length;
  return (
    <div className="space-y-4 animate-fade-in">
      {/* تنبيه المتأخرين */}
      {overdueCount > 0 && (
        <button onClick={onCopyList} className="w-full bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-center justify-between text-right active:scale-[0.99] transition">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[18px] h-[18px] text-rose-600" />
            </div>
            <div>
              <div className="font-bold text-rose-700 text-sm">{overdueCount} زبون متأخر عن التجديد!</div>
              <div className="text-xs text-rose-500">انتهى سنسرهم — تابعهم الآن لاسترجاعهم</div>
            </div>
          </div>
          <span className="text-[11px] bg-white text-rose-600 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0">
            <Copy className="w-3 h-3" />نسخ القائمة
          </span>
        </button>
      )}
      {/* Featured commission card — the hero metric */}
      <div className="brand-grad rounded-3xl p-5 text-white shadow-brand relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold mb-1">
              <Wallet className="w-3.5 h-3.5" />عمولة مريم هذا الشهر
            </div>
            <div className="text-3xl font-black tracking-tight">{fmtMoney(stats.monthCommissions)}</div>
            <div className="text-white/70 text-xs mt-1.5">{stats.month} مبيعة هذا الشهر</div>
          </div>
          <div className="text-left">
            <div className="text-white/80 text-xs font-semibold mb-1">إيرادات الشهر</div>
            <div className="text-lg font-bold">{fmtMoney(stats.monthRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Supporting stats — clean, cohesive */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Package}    label="اليوم"    value={stats.today}     tint="teal" />
        <StatCard icon={TrendingUp} label="الشهر"    value={stats.month}     tint="sky" />
        <StatCard icon={Users}      label="الزبائن"  value={stats.customers} tint="violet" />
      </div>

      {/* تذكيرات اليوم — من ينتهي سنسرهم خلال يومين */}
      <section className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Bell className="w-[18px] h-[18px] text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-[15px] leading-tight">تذكيرات اليوم</h2>
              <p className="text-xs text-slate-400">{dueReminders.length} زبون سنسرهم يقارب الانتهاء</p>
            </div>
          </div>
          {dueReminders.length > 0 && (
            <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-bold">+٣٠٠٠ لكل تجديد</span>
          )}
        </div>
        {dueReminders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium">لا توجد تذكيرات لليوم</p>
            <p className="text-xs text-slate-300 mt-1">سيظهر هنا من يقترب سنسرهم من الانتهاء</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {dueReminders.map(s => <ReminderRow key={s.id} sale={s} onRenew={onRenew} onOutcome={onOutcome} />)}
          </div>
        )}
      </section>

      {/* متأخرون عن التجديد — قابل للطي */}
      {overdueCount > 0 && (
        <section className="bg-white rounded-3xl border border-rose-100 overflow-hidden elev-2">
          <button onClick={() => setShowOverdue(v => !v)} className="w-full px-5 py-4 flex items-center justify-between border-b border-rose-100 bg-rose-50/40 text-right">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                <Clock className="w-[18px] h-[18px] text-rose-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-[15px] leading-tight">متأخرون عن التجديد</h2>
                <p className="text-xs text-rose-500">{overdueCount} زبون انتهى سنسرهم — حاول استرجاعهم</p>
              </div>
            </div>
            <span className="text-slate-400 flex items-center gap-1">
              {showOverdue ? <ChevronLeft className="w-5 h-5 rotate-90" /> : <ChevronLeft className="w-5 h-5 -rotate-90" />}
            </span>
          </button>
          {showOverdue && (
            <div className="divide-y divide-slate-50">
              {overdueReminders.map(s => <ReminderRow key={s.id} sale={s} onRenew={onRenew} onOutcome={onOutcome} />)}
            </div>
          )}
        </section>
      )}

      {/* مدخل التحليلات والإعلانات (للموبايل) */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        <button onClick={() => onTab('analytics')} className="bg-white rounded-2xl border border-slate-100 elev-1 px-3 py-3.5 flex flex-col items-center gap-1.5 active:scale-[0.98] transition">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-[18px] h-[18px] text-indigo-600" />
          </div>
          <div className="font-bold text-slate-900 text-xs">التحليلات</div>
        </button>
        <button onClick={() => onTab('ads')} className="bg-white rounded-2xl border border-slate-100 elev-1 px-3 py-3.5 flex flex-col items-center gap-1.5 active:scale-[0.98] transition">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <Megaphone className="w-[18px] h-[18px] text-rose-600" />
          </div>
          <div className="font-bold text-slate-900 text-xs">أدوات الإعلانات</div>
        </button>
      </div>

      {/* Recent sales */}
      <section className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-[15px]">آخر المبيعات</h2>
          <button onClick={() => onTab('new')} className="text-xs brand-grad text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 shadow-brand active:scale-95 transition">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />بيع جديد
          </button>
        </div>
        {recentSales.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm font-medium">لا توجد مبيعات بعد</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentSales.map(s => <SaleRow key={s.id} sale={s} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }) {
  const tints = {
    teal:   'bg-teal-50 text-teal-600',
    sky:    'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    amber:  'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 elev-1 hover:elev-2 transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tints[tint] || tints.teal}`}>
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </div>
      <div className="font-black text-slate-900 text-2xl tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5 font-medium">{label}</div>
    </div>
  );
}

const NON_RENEWAL_REASONS = [
  'السعر غالي',
  'اشترى من مكان آخر',
  'اعترض على مدة السنسر',
  'لا يحتاج حالياً',
  'لم يرد نهائياً',
  'مشكلة في التوصيل',
  'أخرى',
];

function ReminderRow({ sale, onRenew, onOutcome }) {
  const [showReasons, setShowReasons] = React.useState(false);
  const [customReason, setCustomReason] = React.useState('');
  const daysLeft = daysBetween(todayISO(), sale.expiryDate);
  const msg = genReminderMsg(sale);
  const waLink = `https://wa.me/${waPhone(sale.customerPhone)}?text=${encodeURIComponent(msg)}`;
  const isPending = sale.reminderOutcome === 'pending_reply';

  const pickReason = (reason) => {
    if (reason === 'أخرى') return; // يُكتب يدوياً بالأسفل
    onOutcome(sale.id, 'not_renewed', reason);
    setShowReasons(false);
  };

  return (
    <div className="px-5 py-3.5 hover:bg-slate-50/70 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 truncate text-[15px] flex items-center gap-2">
            {sale.customerName}
            {isPending && <span className="text-[9px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-bold">⏳ بانتظار الرد</span>}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{sale.customerPhone}</span>
            <span className={`px-2 py-0.5 rounded-md ${SENSOR_TYPES[sale.sensorType].color} border text-[10px] font-semibold`}>{SENSOR_TYPES[sale.sensorType].name}</span>
          </div>
          <div className="text-xs mt-1.5 font-bold">
            {daysLeft > 0 ? (
              <span className="text-amber-600">⏳ ينتهي خلال {daysLeft} أيام • {fmtDate(sale.expiryDate)}</span>
            ) : daysLeft === 0 ? (
              <span className="text-rose-600">⚠️ ينتهي اليوم!</span>
            ) : (
              <span className="text-rose-600">⚠️ انتهى منذ {Math.abs(daysLeft)} يوم</span>
            )}
          </div>
        </div>
        <a href={waLink} target="_blank" rel="noreferrer"
          className="shrink-0 brand-grad text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-brand active:scale-95 transition">
          <MessageCircle className="w-3.5 h-3.5" />واتساب
        </a>
      </div>

      {/* أزرار الحالة بعد التذكير */}
      {!showReasons ? (
        <div className="flex items-center gap-1.5 mt-2.5">
          <button onClick={() => onRenew(sale.id)}
            className="flex-1 bg-teal-50 text-teal-700 hover:bg-teal-100 text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition">
            <Check className="w-3 h-3" strokeWidth={3} />تم التجديد
          </button>
          {!isPending && (
            <button onClick={() => onOutcome(sale.id, 'pending_reply')}
              className="flex-1 bg-sky-50 text-sky-600 hover:bg-sky-100 text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition">
              <Clock className="w-3 h-3" />بانتظار الرد
            </button>
          )}
          <button onClick={() => setShowReasons(true)}
            className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition">
            <X className="w-3 h-3" strokeWidth={3} />لم يجدد
          </button>
        </div>
      ) : (
        <div className="mt-2.5 bg-slate-50 rounded-xl p-2.5">
          <div className="text-[11px] font-bold text-slate-600 mb-1.5">سبب عدم التجديد:</div>
          <div className="flex flex-wrap gap-1.5">
            {NON_RENEWAL_REASONS.map(r => (
              <button key={r} onClick={() => pickReason(r)}
                className="text-[11px] bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 px-2.5 py-1 rounded-lg font-semibold transition">
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <input value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder="أو اكتب سبباً آخر..." dir="rtl"
              className="flex-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-400" />
            <button onClick={() => { if (customReason.trim()) { onOutcome(sale.id, 'not_renewed', customReason.trim()); setShowReasons(false); } }}
              disabled={!customReason.trim()}
              className="text-[11px] brand-grad text-white px-3 py-1.5 rounded-lg font-bold disabled:opacity-40">حفظ</button>
            <button onClick={() => setShowReasons(false)}
              className="text-[11px] bg-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SaleRow({ sale }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 truncate text-[15px]">{sale.customerName}</span>
          {sale.isRenewal && <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md font-bold">تجديد</span>}
        </div>
        <div className="text-xs text-slate-400 mt-1 flex gap-2 items-center flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[10px] border font-semibold ${SENSOR_TYPES[sale.sensorType]?.color}`}>{SENSOR_TYPES[sale.sensorType]?.name}</span>
          <span>{fmtDate(sale.saleDate)}</span>
        </div>
      </div>
      <div className="text-left shrink-0">
        <div className="font-black text-slate-900 text-[15px]">{fmtMoney(sale.price + sale.deliveryFee)}</div>
        <div className="text-[10px] text-emerald-600 font-semibold">+{fmtMoney(sale.commissionAmount)} عمولة</div>
      </div>
    </div>
  );
}

// ================ New Sale ================
function NewSale({ onSave, showToast }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerAddress: '', city: '',
    sensorType: 'libre2',
    price: SENSOR_TYPES.libre2.defaultPrice,
    deliveryFee: DEFAULT_DELIVERY,
    platform: 'facebook'
  });
  const [savedSale, setSavedSale] = useState(null);

  const handleImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImage(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
      setImageMediaType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!imageBase64) return;
    setExtracting(true);
    try {
      const data = await extractFromScreenshot(imageBase64, imageMediaType);
      setForm(f => {
        const newSensor = data.sensorType || f.sensorType;
        const sensorCfg = SENSOR_TYPES[newSensor] || SENSOR_TYPES[f.sensorType];
        // Robust price: use extracted only if it's a valid positive number
        const extractedPrice = Number(data.price);
        const finalPrice = (data.price && !isNaN(extractedPrice) && extractedPrice > 0)
          ? extractedPrice
          : sensorCfg.defaultPrice;
        // Delivery: allow explicit 0 (free) but fall back to default if missing/empty
        const extractedDelivery = data.deliveryFee;
        const finalDelivery = (extractedDelivery !== null && extractedDelivery !== undefined && extractedDelivery !== '' && !isNaN(Number(extractedDelivery)))
          ? Number(extractedDelivery)
          : (f.deliveryFee !== '' && f.deliveryFee !== undefined ? f.deliveryFee : DEFAULT_DELIVERY);
        return {
          ...f,
          customerName:    data.name        || f.customerName,
          customerPhone:   data.phone       || f.customerPhone,
          customerAddress: data.address     || f.customerAddress,
          city:            data.city        || f.city,
          sensorType:      newSensor,
          price:           finalPrice,
          deliveryFee:     finalDelivery,
          platform:        data.platform    || f.platform,
        };
      });
      showToast('تم استخراج البيانات بنجاح ✨');
    } catch (e) {
      showToast('فشل الاستخراج - أدخل البيانات يدوياً', 'error');
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!form.customerName || !form.customerPhone || !form.customerAddress || !form.price) {
      showToast('املأ الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const sale = await onSave(form);
      setSavedSale(sale);
    } catch (e) {
      // Error already shown by parent
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImage(null); setImageBase64(null); setImageMediaType(null);
    setForm({
      customerName: '', customerPhone: '', customerAddress: '', city: '',
      sensorType: 'libre2',
      price: SENSOR_TYPES.libre2.defaultPrice,
      deliveryFee: DEFAULT_DELIVERY,
      platform: 'facebook'
    });
    setSavedSale(null);
  };

  if (savedSale) return <SaleSuccess sale={savedSale} onNew={reset} showToast={showToast} />;

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
      <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <Sparkles className="w-[18px] h-[18px] text-teal-600" />
          </div>
          <div>
            <h2 className="font-bold text-[15px] text-slate-900 leading-tight">استخراج ذكي</h2>
            <p className="text-xs text-slate-400">ارفع صورة المحادثة لملء البيانات تلقائياً</p>
          </div>
        </div>

        {!image ? (
          <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-teal-400 hover:bg-teal-50/40 transition cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleImage(e.target.files[0])} />
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-700">اختر صورة المحادثة</div>
            <div className="text-xs text-slate-400 mt-1">PNG / JPG / WEBP</div>
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={image} alt="" className="w-full max-h-64 object-contain" />
              <button onClick={() => { setImage(null); setImageBase64(null); }}
                className="absolute top-2 left-2 bg-white/90 hover:bg-white p-1.5 rounded-lg shadow elev-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            <button onClick={handleExtract} disabled={extracting}
              className="w-full brand-grad text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-brand active:scale-[0.99] transition disabled:opacity-50">
              {extracting ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الاستخراج...</> : <><Zap className="w-4 h-4" />استخراج البيانات بالذكاء الاصطناعي</>}
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 elev-2">
        <h2 className="font-bold text-[15px] text-slate-900">بيانات الطلب</h2>

        <Field label="اسم الزبون *" value={form.customerName} onChange={v => setForm(f => ({...f, customerName: v}))} />
        <Field label="رقم الهاتف *" value={form.customerPhone} onChange={v => setForm(f => ({...f, customerPhone: v}))} placeholder="٠٧٧٠ XXX XXXX" />
        <Field label="العنوان الكامل *" value={form.customerAddress} onChange={v => setForm(f => ({...f, customerAddress: v}))} textarea />
        <Field label="المحافظة" value={form.city} onChange={v => setForm(f => ({...f, city: v}))} placeholder="بغداد" />

        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">نوع السنسر *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(SENSOR_TYPES).map(([k, v]) => (
              <button key={k} onClick={() => setForm(f => ({...f, sensorType: k, price: v.defaultPrice}))}
                className={`p-3.5 rounded-2xl border-2 text-right transition ${form.sensorType === k ? 'border-teal-500 bg-teal-50 shadow-brand' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <div className="font-bold text-sm text-slate-900">{v.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{v.duration} يوم</div>
                <div className={`text-sm font-black mt-1.5 ${form.sensorType === k ? 'text-teal-700' : 'text-slate-700'}`}>
                  {fmtMoney(v.defaultPrice)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">السعر *</label>
              {form.price !== SENSOR_TYPES[form.sensorType].defaultPrice && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({...f, price: SENSOR_TYPES[f.sensorType].defaultPrice}))}
                  className="text-[10px] text-emerald-600 hover:text-teal-800 font-semibold flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" />افتراضي
                </button>
              )}
            </div>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({...f, price: e.target.value === '' ? '' : Number(e.target.value)}))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 text-sm outline-none transition font-semibold"
            />
            <div className="text-[10px] text-slate-400 mt-1">افتراضي: {fmtMoney(SENSOR_TYPES[form.sensorType].defaultPrice)}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">التوصيل</label>
              {form.deliveryFee !== DEFAULT_DELIVERY && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({...f, deliveryFee: DEFAULT_DELIVERY}))}
                  className="text-[10px] text-emerald-600 hover:text-teal-800 font-semibold flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" />افتراضي
                </button>
              )}
            </div>
            <input
              type="number"
              value={form.deliveryFee}
              onChange={e => setForm(f => ({...f, deliveryFee: e.target.value === '' ? 0 : Number(e.target.value)}))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 text-sm outline-none transition font-semibold"
            />
            <div className="text-[10px] text-slate-400 mt-1">
              {Number(form.deliveryFee) === 0 ? '🎁 توصيل مجاني (سيُذكر للزبون)' : `افتراضي: ${fmtMoney(DEFAULT_DELIVERY)}`}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">المنصة</label>
          <div className="flex gap-2">
            {Object.entries(PLATFORMS).map(([k, v]) => (
              <button key={k} onClick={() => setForm(f => ({...f, platform: k}))}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition ${form.platform === k ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full brand-grad text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-brand active:scale-[0.99] transition disabled:opacity-50">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</> : <><Check className="w-4 h-4" />حفظ وتوليد الرسائل</>}
        </button>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, textarea }) {
  const cls = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 text-sm outline-none transition';
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

// ================ Sale Success ================
function SaleSuccess({ sale, onNew, showToast }) {
  const customerMsg = genCustomerMsg(sale);
  const deliveryMsg = genDeliveryMsg(sale);
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); showToast('تم النسخ'); } catch(e) {} };
  const waCustomer = `https://wa.me/${waPhone(sale.customerPhone)}?text=${encodeURIComponent(customerMsg)}`;
  const waDelivery = `https://wa.me/${waPhone(DELIVERY_PHONE)}?text=${encodeURIComponent(deliveryMsg)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="brand-grad rounded-3xl p-6 text-white text-center shadow-brand">
        <div className="w-14 h-14 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-3">
          <Check className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">تم حفظ البيع ✨</h2>
        <div className="text-sm mt-2 opacity-90">
          {sale.isRenewal ? '🔁 تجديد' : '🆕 زبون جديد'} • عمولة مريم: {fmtMoney(sale.commissionAmount)}
        </div>
        <div className="text-xs mt-1 opacity-80">موعد التذكير القادم: {fmtDate(sale.reminderDate)}</div>
      </div>

      <MessageCard title="📱 رسالة للزبون" msg={customerMsg} onCopy={() => copy(customerMsg)} waLink={waCustomer} waLabel="إرسال للزبون" />
      <MessageCard title="📦 رسالة للمندوب" msg={deliveryMsg} onCopy={() => copy(deliveryMsg)} waLink={waDelivery} waLabel="إرسال للمندوب" />

      <button onClick={onNew} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />بيع جديد
      </button>
    </div>
  );
}

function MessageCard({ title, msg, onCopy, waLink, waLabel = 'إرسال' }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-sm">{title}</h3>
        <div className="flex gap-2">
          <button onClick={onCopy} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
            <Copy className="w-3 h-3" />نسخ
          </button>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="text-xs brand-grad text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow-brand">
              <MessageCircle className="w-3 h-3" />{waLabel}
            </a>
          )}
        </div>
      </div>
      <pre className="p-5 text-sm whitespace-pre-wrap font-cairo leading-relaxed bg-slate-50/50">{msg}</pre>
    </div>
  );
}

// ================ Customers ================
function CustomersList({ customers, sales, onDeleteSale, onUpdateCustomer, onUpdateSale, onDeleteCustomer }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? customers.find(c => c.id === selectedId) : null;

  const filtered = customers.filter(c =>
    !q || c.name?.includes(q) || c.phone?.includes(q) || c.address?.includes(q) || c.city?.includes(q)
  ).sort((a, b) => (b.lastPurchase || '').localeCompare(a.lastPurchase || ''));

  const customerSales = selected
    ? sales.filter(s => s.customerPhone === selected.id).sort((a, b) => (b.saleDate || '').localeCompare(a.saleDate || ''))
    : [];

  useEffect(() => {
    if (selectedId && !customers.find(c => c.id === selectedId)) setSelectedId(null);
  }, [customers, selectedId]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-4 elev-1">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث: اسم، هاتف، عنوان..."
            className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 text-sm outline-none" />
        </div>
        <div className="text-xs text-slate-500 mt-2">{filtered.length} زبون</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-10 elev-1 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">لا يوجد زبائن بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2 divide-y divide-slate-100">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-right p-4 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {c.name}
                    {c.totalPurchases > 1 && <span className="text-[10px] bg-emerald-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">{c.totalPurchases}×</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center flex-wrap">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                    {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <CustomerDrawer
          customer={selected}
          sales={customerSales}
          onClose={() => setSelectedId(null)}
          onUpdateCustomer={onUpdateCustomer}
          onUpdateSale={onUpdateSale}
          onDeleteSale={onDeleteSale}
          onDeleteCustomer={onDeleteCustomer}
        />
      )}
    </div>
  );
}

function CustomerDrawer({ customer, sales, onClose, onUpdateCustomer, onUpdateSale, onDeleteSale, onDeleteCustomer }) {
  const [editMode, setEditMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [form, setForm] = useState({
    name: customer.name, phone: customer.phone, address: customer.address,
    city: customer.city || '', platform: customer.platform || 'facebook',
  });

  useEffect(() => {
    setForm({
      name: customer.name, phone: customer.phone, address: customer.address,
      city: customer.city || '', platform: customer.platform || 'facebook',
    });
  }, [customer.id, customer.name, customer.phone, customer.address, customer.city, customer.platform]);

  const saveCustomer = async () => {
    if (!form.name || !form.phone) return;
    await onUpdateCustomer(customer.id, form);
    setEditMode(false);
  };

  const cancelEdit = () => {
    setForm({
      name: customer.name, phone: customer.phone, address: customer.address,
      city: customer.city || '', platform: customer.platform || 'facebook',
    });
    setEditMode(false);
  };

  const handleDeleteCustomer = () => {
    onDeleteCustomer(customer.id);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold truncate">{customer.name}</h3>
            {customer.totalPurchases > 1 && (
              <span className="text-[10px] bg-emerald-100 text-teal-800 px-1.5 py-0.5 rounded font-bold shrink-0">{customer.totalPurchases}×</span>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />بيانات الزبون</h4>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 hover:bg-slate-100">
                  <Edit3 className="w-3 h-3" />تعديل
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={cancelEdit} className="text-xs bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg font-semibold">إلغاء</button>
                  <button onClick={saveCustomer} className="text-xs brand-grad text-white px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow-brand">
                    <Save className="w-3 h-3" />حفظ
                  </button>
                </div>
              )}
            </div>

            {!editMode ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoBox label="الهاتف"    value={customer.phone} />
                <InfoBox label="المحافظة"  value={customer.city || '—'} />
                <InfoBox label="الطلبات"   value={customer.totalPurchases || 0} />
                <InfoBox label="المنصة"    value={PLATFORMS[customer.platform]?.name || '—'} />
                <InfoBox label="العنوان"   value={customer.address || '—'} full />
                <InfoBox label="أول طلب"  value={customer.firstPurchase ? fmtDate(customer.firstPurchase) : '—'} />
                <InfoBox label="آخر طلب"  value={customer.lastPurchase  ? fmtDate(customer.lastPurchase)  : '—'} />
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="الاسم *"       value={form.name}    onChange={v => setForm(f => ({...f, name: v}))} />
                <Field label="الهاتف *"      value={form.phone}   onChange={v => setForm(f => ({...f, phone: v}))} />
                <Field label="العنوان"       value={form.address} onChange={v => setForm(f => ({...f, address: v}))} textarea />
                <Field label="المحافظة"      value={form.city}    onChange={v => setForm(f => ({...f, city: v}))} />
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">المنصة الأساسية</label>
                  <div className="flex gap-2">
                    {Object.entries(PLATFORMS).map(([k, v]) => (
                      <button key={k} onClick={() => setForm(f => ({...f, platform: k}))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition ${form.platform === k ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />سجل المشتريات ({sales.length})</h4>
            </div>
            {sales.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-4">لا توجد مشتريات</div>
            ) : (
              <div className="space-y-2">
                {sales.map(s => (
                  <SaleCard
                    key={s.id}
                    sale={s}
                    editing={editingSaleId === s.id}
                    onStartEdit={() => setEditingSaleId(s.id)}
                    onCancelEdit={() => setEditingSaleId(null)}
                    onSaveEdit={async (updates) => {
                      await onUpdateSale(s.id, updates);
                      setEditingSaleId(null);
                    }}
                    onDelete={() => onDeleteSale(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <button onClick={handleDeleteCustomer}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-red-200">
              <Trash2 className="w-4 h-4" />حذف الزبون وجميع مبيعاته
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaleCard({ sale, editing, onStartEdit, onCancelEdit, onSaveEdit, onDelete }) {
  const [form, setForm] = useState({
    saleDate: sale.saleDate, sensorType: sale.sensorType,
    price: sale.price, deliveryFee: sale.deliveryFee,
    platform: sale.platform, isRenewal: sale.isRenewal,
  });
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    setForm({
      saleDate: sale.saleDate, sensorType: sale.sensorType,
      price: sale.price, deliveryFee: sale.deliveryFee,
      platform: sale.platform, isRenewal: sale.isRenewal,
    });
  }, [sale.id, editing]);

  if (!editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${SENSOR_TYPES[sale.sensorType]?.color}`}>
              {SENSOR_TYPES[sale.sensorType]?.name}
            </span>
            {sale.isRenewal ? (
              <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-bold">تجديد</span>
            ) : (
              <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-bold">جديد</span>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowMessages(v => !v)}
              className={`p-1.5 rounded-lg transition ${showMessages ? 'bg-emerald-100 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
              title="الرسائل">
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button onClick={onStartEdit} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg" title="تعديل">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div><span className="text-slate-500">التاريخ: </span><span className="font-semibold">{fmtDate(sale.saleDate)}</span></div>
          <div><span className="text-slate-500">الانتهاء: </span><span className="font-semibold">{fmtDate(sale.expiryDate)}</span></div>
          <div><span className="text-slate-500">السعر: </span><span className="font-semibold">{fmtMoney(sale.price)}</span></div>
          <div><span className="text-slate-500">التوصيل: </span><span className="font-semibold">{fmtMoney(sale.deliveryFee)}</span></div>
          <div className="col-span-2 pt-1.5 mt-1 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">الإجمالي:</span>
            <span className="font-bold text-teal-700">{fmtMoney(sale.price + sale.deliveryFee)}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">عمولة:</span>
            <span className="font-bold">{fmtMoney(sale.commissionAmount)}</span>
          </div>
        </div>
        {showMessages && <SaleMessages sale={sale} />}
      </div>
    );
  }

  const sensor = SENSOR_TYPES[form.sensorType];
  const computedExpiry = addDays(form.saleDate, sensor.duration);
  const computedReminder = addDays(computedExpiry, -sensor.reminderBefore);

  return (
    <div className="bg-amber-50/60 border-2 border-amber-300 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-bold text-sm flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" />تعديل المبيعة</h5>
        <div className="flex gap-1.5">
          <button onClick={onCancelEdit} className="text-xs bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg font-semibold">إلغاء</button>
          <button onClick={() => onSaveEdit(form)} className="text-xs brand-grad text-white px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow-brand">
            <Save className="w-3 h-3" />حفظ
          </button>
        </div>
      </div>

      <Field label="تاريخ البيع" type="date" value={form.saleDate} onChange={v => setForm(f => ({...f, saleDate: v}))} />

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">نوع السنسر</label>
        <div className="space-y-1.5">
          {Object.entries(SENSOR_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setForm(f => ({...f, sensorType: k, price: v.defaultPrice}))}
              className={`w-full p-2 rounded-lg border-2 text-right text-xs transition ${form.sensorType === k ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}>
              <span className="font-bold">{v.name}</span>
              <span className="text-slate-500 mx-1">• {v.duration} يوم • {fmtMoney(v.defaultPrice)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="السعر"    type="number" value={form.price}       onChange={v => setForm(f => ({...f, price: Number(v) || 0}))} />
        <Field label="التوصيل"  type="number" value={form.deliveryFee} onChange={v => setForm(f => ({...f, deliveryFee: Number(v) || 0}))} />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">المنصة</label>
        <div className="flex gap-1.5">
          {Object.entries(PLATFORMS).map(([k, v]) => (
            <button key={k} onClick={() => setForm(f => ({...f, platform: k}))}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border-2 transition ${form.platform === k ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}>
              {v.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer">
        <input type="checkbox" checked={form.isRenewal}
          onChange={e => setForm(f => ({...f, isRenewal: e.target.checked}))}
          className="w-4 h-4 accent-emerald-700" />
        <span className="text-xs font-semibold flex-1">مبيعة تجديد</span>
        <span className="text-[10px] text-slate-500 font-semibold">
          عمولة: {fmtMoney(form.isRenewal ? COMMISSION_RENEWAL : COMMISSION_NEW)}
        </span>
      </label>

      <div className="text-[11px] bg-white border border-slate-200 rounded-lg p-2 text-slate-600 space-y-0.5">
        <div>📅 تاريخ الانتهاء المحسوب: <b>{fmtDate(computedExpiry)}</b></div>
        <div>🔔 تاريخ التذكير المحسوب: <b>{fmtDate(computedReminder)}</b></div>
      </div>
    </div>
  );
}

function SaleMessages({ sale }) {
  const [customerMsg, setCustomerMsg] = useState(() => genCustomerMsg(sale));
  const [deliveryMsg, setDeliveryMsg] = useState(() => genDeliveryMsg(sale));
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    setCustomerMsg(genCustomerMsg(sale));
    setDeliveryMsg(genDeliveryMsg(sale));
  }, [sale.id, sale.price, sale.deliveryFee, sale.sensorType, sale.expiryDate, sale.saleDate, sale.customerName, sale.customerPhone, sale.customerAddress]);

  const copy = async (text, which) => {
    try { await navigator.clipboard.writeText(text); } catch(e) {}
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const regenerate = () => {
    setCustomerMsg(genCustomerMsg(sale));
    setDeliveryMsg(genDeliveryMsg(sale));
  };

  const waLink = `https://wa.me/${waPhone(sale.customerPhone)}?text=${encodeURIComponent(customerMsg)}`;
  const waDeliveryLink = `https://wa.me/${waPhone(DELIVERY_PHONE)}?text=${encodeURIComponent(deliveryMsg)}`;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />الرسائل الجاهزة
        </span>
        <button onClick={regenerate} className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <RefreshCw className="w-2.5 h-2.5" />إعادة التوليد
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-600">📱 رسالة الزبون</span>
          <div className="flex gap-1">
            <button onClick={() => copy(customerMsg, 'cust')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md font-semibold flex items-center gap-1">
              {copied === 'cust' ? <><Check className="w-2.5 h-2.5 text-emerald-600" />نُسخ</> : <><Copy className="w-2.5 h-2.5" />نسخ</>}
            </button>
            <a href={waLink} target="_blank" rel="noreferrer"
              className="text-[10px] brand-grad text-white px-2 py-1 rounded-md font-semibold flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" />إرسال
            </a>
          </div>
        </div>
        <textarea value={customerMsg} onChange={e => setCustomerMsg(e.target.value)} rows={7} dir="rtl"
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed font-cairo focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-600">📦 رسالة المندوب</span>
          <div className="flex gap-1">
            <button onClick={() => copy(deliveryMsg, 'del')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md font-semibold flex items-center gap-1">
              {copied === 'del' ? <><Check className="w-2.5 h-2.5 text-emerald-600" />نُسخ</> : <><Copy className="w-2.5 h-2.5" />نسخ</>}
            </button>
            <a href={waDeliveryLink} target="_blank" rel="noreferrer"
              className="text-[10px] brand-grad text-white px-2 py-1 rounded-md font-semibold flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" />إرسال للمندوب
            </a>
          </div>
        </div>
        <textarea value={deliveryMsg} onChange={e => setDeliveryMsg(e.target.value)} rows={7} dir="rtl"
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed font-cairo focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition" />
      </div>
    </div>
  );
}

function InfoBox({ label, value, full }) {
  return (
    <div className={`bg-slate-50 rounded-xl p-3 ${full ? 'col-span-2' : ''}`}>
      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

// ================ Ads Tools ================
function AdsView({ analytics, customers, sales, showToast }) {
  const { topCities, topSensors, daysOfWeek, bestDay, bestMonth, avgCustomerValue, renewalRate, totalRevenue, totalCust } = analytics;

  // حساب الجماهير
  const COLOR_BADGE = {
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  const audiences = useMemo(() => ([
    { id: 'all',     label: 'كل المشترين',       desc: 'للاستهداف المشابه (Lookalike) — ميتا تجد من يشبههم', color: 'teal',   ...buildSegmentMetaCSV(customers, sales, 'all') },
    { id: 'overdue', label: 'المتأخرون (تجديد)',  desc: 'إعادة استهداف من انتهى سنسرهم خلال ٦٠ يوم',          color: 'rose',   ...buildSegmentMetaCSV(customers, sales, 'overdue') },
    { id: 'vip',     label: 'أفضل الزبائن (VIP)', desc: 'عروض حصرية لمن اشترى مرتين فأكثر',                    color: 'amber',  ...buildSegmentMetaCSV(customers, sales, 'vip') },
    { id: 'onetime', label: 'اشتروا مرة واحدة',   desc: 'حملة استرجاع لمن لم يعد',                              color: 'indigo', ...buildSegmentMetaCSV(customers, sales, 'onetime') },
  ]), [customers, sales]);

  const downloadCSV = (csv, name) => {
    const url = csvToDataUrl(csv);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    showToast('جارٍ تنزيل الملف 📥');
  };
  const copyCSV = async (csv) => {
    try { await navigator.clipboard.writeText(csv); showToast('تم نسخ بيانات الجمهور ✓'); }
    catch (e) { showToast('تعذّر النسخ', 'error'); }
  };

  // حاسبة ROI
  const [adSpend, setAdSpend] = useState('');
  const [newCust, setNewCust] = useState('');
  const roi = useMemo(() => {
    const spend = Number(adSpend) || 0;
    const cust = Number(newCust) || 0;
    if (spend <= 0 || cust <= 0) return null;
    const costPerCust = Math.round(spend / cust);
    const revenue = cust * avgCustomerValue;
    const profit = revenue - spend;
    const roiPct = spend > 0 ? Math.round((profit / spend) * 100) : 0;
    return { costPerCust, revenue, profit, roiPct };
  }, [adSpend, newCust, avgCustomerValue]);

  const maxCity = Math.max(1, ...topCities.map(c => c[1]));
  const maxDay = Math.max(1, ...daysOfWeek.map(d => d.count));

  // لون الحرارة حسب الكثافة
  const heatColor = (pct) => {
    if (pct >= 80) return 'bg-rose-500';
    if (pct >= 55) return 'bg-orange-400';
    if (pct >= 30) return 'bg-amber-400';
    if (pct >= 12) return 'bg-teal-400';
    return 'bg-slate-300';
  };

  // تقرير إعلاني نصي
  const adReport = useMemo(() => {
    const topCity = topCities[0];
    const topSensor = topSensors[0];
    const lines = [
      '📊 تقرير إعلاني — LCare',
      '',
      `• إجمالي الزبائن: ${totalCust}`,
      `• معدل التجديد: ${renewalRate}%`,
      `• متوسط قيمة الزبون: ${fmtMoney(avgCustomerValue)}`,
      topCity ? `• أعلى محافظة: ${topCity[0]} (${topCity[1]} زبون)` : '',
      topSensor ? `• الأكثر مبيعاً: ${topSensor[0]} (${topSensor[1]} مبيعة)` : '',
      bestDay ? `• أفضل يوم للبيع: ${bestDay.name}` : '',
      bestMonth ? `• أفضل شهر: ${new Date(bestMonth[0] + '-01').toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}` : '',
      '',
      '🎯 التوصيات:',
      topCity ? `- ركّز إعلاناتك على ${topCities.slice(0, 3).map(c => c[0]).join('، ')}` : '',
      bestDay ? `- انشر إعلاناتك يوم ${bestDay.name} لأعلى تفاعل` : '',
      '- استخدم جمهور "كل المشترين" لعمل Lookalike',
      '- أعد استهداف "المتأخرين" بإعلان تجديد',
    ].filter(Boolean);
    return lines.join('\n');
  }, [topCities, topSensors, daysOfWeek, bestDay, bestMonth, avgCustomerValue, renewalRate, totalCust]);

  const copyReport = async () => {
    try { await navigator.clipboard.writeText(adReport); showToast('تم نسخ التقرير 📋'); }
    catch (e) { showToast('تعذّر النسخ', 'error'); }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      {/* جماهير ميتا */}
      <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-[18px] h-[18px] text-teal-600" />
          <h2 className="font-bold text-slate-900 text-[15px]">جماهير Meta المخصصة</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">صدّر كل جمهور كملف CSV وارفعه في Meta Ads Manager → Audiences → Custom Audience → Customer list</p>
        <div className="space-y-2.5">
          {audiences.map(a => (
            <div key={a.id} className={`rounded-2xl border-2 p-3.5 ${a.count > 0 ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {a.label}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${COLOR_BADGE[a.color] || COLOR_BADGE.teal}`}>{a.count}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.desc}</div>
                </div>
              </div>
              {a.count > 0 && (
                <div className="flex gap-1.5 mt-2.5">
                  <button onClick={() => downloadCSV(a.csv, `meta-${a.id}.csv`)}
                    className="flex-1 brand-grad text-white text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-brand active:scale-95 transition">
                    <Download className="w-3 h-3" />تنزيل CSV
                  </button>
                  <button onClick={() => copyCSV(a.csv)}
                    className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                    <Copy className="w-3 h-3" />نسخ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* خريطة حرارية للمحافظات */}
      {topCities.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-[18px] h-[18px] text-rose-500" />
            <h2 className="font-bold text-slate-900 text-[15px]">الخريطة الحرارية — أين أعلن؟</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3">كلما زاد الاحمرار، زاد تركّز زبائنك = وجّه ميزانيتك هناك</p>
          <div className="flex flex-wrap gap-2">
            {topCities.map(([city, count]) => {
              const pct = Math.round((count / maxCity) * 100);
              return (
                <div key={city} className={`${heatColor(pct)} rounded-xl px-3 py-2 text-white shadow-sm`}>
                  <div className="font-bold text-sm">{city}</div>
                  <div className="text-[11px] opacity-90">{count} زبون</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
            <span>أقل</span>
            <div className="flex gap-0.5">
              <div className="w-5 h-2.5 rounded bg-slate-300" />
              <div className="w-5 h-2.5 rounded bg-teal-400" />
              <div className="w-5 h-2.5 rounded bg-amber-400" />
              <div className="w-5 h-2.5 rounded bg-orange-400" />
              <div className="w-5 h-2.5 rounded bg-rose-500" />
            </div>
            <span>أكثر</span>
          </div>
        </section>
      )}

      {/* أفضل أوقات البيع */}
      {sales.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-[18px] h-[18px] text-indigo-500" />
            <h2 className="font-bold text-slate-900 text-[15px]">أفضل أوقات البيع — متى أعلن؟</h2>
          </div>
          {bestDay && <p className="text-xs text-teal-600 font-semibold mb-3">💡 أفضل يوم: {bestDay.name} {bestMonth ? `• أفضل شهر: ${new Date(bestMonth[0] + '-01').toLocaleDateString('ar-IQ', { month: 'long' })}` : ''}</p>}
          <div className="space-y-2">
            {daysOfWeek.map(d => {
              const pct = Math.round((d.count / maxDay) * 100);
              const isBest = d.name === bestDay?.name;
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <span className={`text-xs w-14 shrink-0 ${isBest ? 'font-black text-teal-700' : 'font-semibold text-slate-600'}`}>{d.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${isBest ? 'brand-grad' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 w-8 text-left">{d.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* حاسبة العائد ROI */}
      <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-[18px] h-[18px] text-emerald-600" />
          <h2 className="font-bold text-slate-900 text-[15px]">حاسبة عائد الإعلان (ROI)</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">أدخل تكلفة الإعلان وعدد الزبائن الجدد لمعرفة ربحك</p>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">كم صرفت على الإعلان؟</label>
            <input value={adSpend} onChange={e => setAdSpend(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
              placeholder="مثال: 50000" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">كم زبون جاء منه؟</label>
            <input value={newCust} onChange={e => setNewCust(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
              placeholder="مثال: 8" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400" />
          </div>
        </div>
        {roi ? (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">تكلفة الزبون الواحد</div>
              <div className="font-black text-slate-800 text-lg">{fmtMoney(roi.costPerCust)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">الإيراد المتوقع</div>
              <div className="font-black text-slate-800 text-lg">{fmtMoney(roi.revenue)}</div>
            </div>
            <div className={`rounded-xl p-3 col-span-2 ${roi.profit >= 0 ? 'bg-teal-50' : 'bg-rose-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-[11px] ${roi.profit >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>صافي الربح</div>
                  <div className={`font-black text-xl ${roi.profit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>{fmtMoney(roi.profit)}</div>
                </div>
                <div className={`text-2xl font-black ${roi.profit >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>{roi.roiPct > 0 ? '+' : ''}{roi.roiPct}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-slate-400 py-2">أدخل القيمتين لرؤية النتيجة • متوسط قيمة الزبون لديك: {fmtMoney(avgCustomerValue)}</div>
        )}
      </section>

      {/* التقرير الإعلاني */}
      <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-[18px] h-[18px] text-slate-600" />
            <h2 className="font-bold text-slate-900 text-[15px]">التقرير الإعلاني الجاهز</h2>
          </div>
          <button onClick={copyReport} className="text-[11px] brand-grad text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-brand active:scale-95 transition">
            <Copy className="w-3 h-3" />نسخ
          </button>
        </div>
        <pre className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-700 whitespace-pre-wrap font-cairo leading-relaxed" dir="rtl">{adReport}</pre>
      </section>
    </div>
  );
}

// ================ Analytics ================
function Analytics({ analytics, stats }) {
  const { topCities, topSensors, months, renewalRate, repeatCust, totalCust, topCustomers, atRisk, totalRevenue } = analytics;
  const maxCity = Math.max(1, ...topCities.map(c => c[1]));
  const maxSensor = Math.max(1, ...topSensors.map(s => s[1]));
  const maxMonth = Math.max(1, ...months.map(m => m[1].revenue));

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      {/* ملخص علوي */}
      <div className="grid grid-cols-2 gap-3">
        <div className="brand-grad rounded-3xl p-5 text-white shadow-brand">
          <div className="text-white/80 text-xs font-semibold mb-1">إجمالي الإيرادات</div>
          <div className="text-2xl font-black">{fmtMoney(totalRevenue)}</div>
          <div className="text-white/70 text-[11px] mt-1">{stats.total} مبيعة</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-5 elev-1">
          <div className="text-slate-400 text-xs font-semibold mb-1">معدل التجديد</div>
          <div className="text-2xl font-black text-teal-700">{renewalRate}%</div>
          <div className="text-slate-400 text-[11px] mt-1">{repeatCust} من {totalCust} زبون يعودون</div>
        </div>
      </div>

      {/* النمو الشهري */}
      {months.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <h2 className="font-bold text-slate-900 text-[15px] mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" />الإيرادات الشهرية</h2>
          <div className="space-y-2.5">
            {months.slice(-6).map(([mo, d]) => {
              const pct = Math.round((d.revenue / maxMonth) * 100);
              const moName = new Date(mo + '-01').toLocaleDateString('ar-IQ', { month: 'long' });
              return (
                <div key={mo}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{moName}</span>
                    <span className="text-slate-500 font-bold">{fmtMoney(d.revenue)} • {d.count} بيع</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="brand-grad h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* المحافظات */}
      {topCities.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <h2 className="font-bold text-slate-900 text-[15px] mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500" />أكثر المحافظات شراءً</h2>
          <div className="space-y-2.5">
            {topCities.slice(0, 8).map(([city, count]) => {
              const pct = Math.round((count / maxCity) * 100);
              return (
                <div key={city}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{city}</span>
                    <span className="text-slate-500">{count} زبون</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* أنواع السنسرات */}
      {topSensors.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <h2 className="font-bold text-slate-900 text-[15px] mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500" />الأكثر مبيعاً حسب النوع</h2>
          <div className="space-y-2.5">
            {topSensors.map(([sensor, count]) => {
              const pct = Math.round((count / maxSensor) * 100);
              return (
                <div key={sensor}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{sensor}</span>
                    <span className="text-slate-500">{count} مبيعة</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* أفضل الزبائن */}
      {topCustomers.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-slate-900 text-[15px]">أفضل الزبائن (الأكثر ولاءً)</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {topCustomers.map((c, i) => (
              <div key={c.phone} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className="font-black text-teal-700 text-sm">{c.count} مرات</div>
                  <div className="text-[11px] text-slate-400">{fmtMoney(c.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* زبائن في خطر */}
      {atRisk.length > 0 && (
        <section className="bg-white rounded-3xl border border-rose-100 overflow-hidden elev-2">
          <div className="px-5 py-3.5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="font-bold text-slate-900 text-[15px]">زبائن في خطر</h2>
            </div>
            <span className="text-[11px] text-rose-500 font-semibold">{atRisk.length} زبون</span>
          </div>
          <div className="px-5 py-2.5 text-xs text-slate-500 bg-rose-50/30">اشتروا مرة واحدة فقط وانتهى سنسرهم منذ فترة ولم يعودوا — حاول استرجاعهم بعرض خاص.</div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {atRisk.map(c => {
              const waLink = `https://wa.me/${waPhone(c.phone)}`;
              return (
                <div key={c.phone} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.phone} • آخر شراء {fmtDate(c.lastDate)}</div>
                  </div>
                  <a href={waLink} target="_blank" rel="noreferrer" className="shrink-0 bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition">
                    <MessageCircle className="w-3.5 h-3.5" />تواصل
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stats.total === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center text-slate-400 elev-1">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">لا توجد بيانات كافية للتحليل بعد</p>
        </div>
      )}
    </div>
  );
}

// ================ Commissions ================
function Commissions({ sales }) {
  const [month, setMonth] = useState(todayISO().slice(0, 7));

  const navigate = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const monthSales = sales.filter(s => s.saleDate?.startsWith(month));
  const total = monthSales.reduce((a, s) => a + s.commissionAmount, 0);
  const newCount = monthSales.filter(s => !s.isRenewal).length;
  const renewCount = monthSales.filter(s => s.isRenewal).length;
  const newTotal = newCount * COMMISSION_NEW;
  const renewTotal = renewCount * COMMISSION_RENEWAL;

  // إحصائية أسباب عدم التجديد (لكل المبيعات)
  const reasonStats = useMemo(() => {
    const counts = {};
    for (const s of sales) {
      if (s.reminderOutcome === 'not_renewed' && s.reminderReason) {
        counts[s.reminderReason] = (counts[s.reminderReason] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [sales]);
  const totalNotRenewed = reasonStats.reduce((a, [, n]) => a + n, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-4 elev-1 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
        <div className="font-bold text-center">{new Date(month + '-01').toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => navigate(1)}  className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
      </div>

      <div className="brand-grad rounded-3xl p-6 text-white text-center shadow-brand">
        <div className="text-sm opacity-80 mb-1">إجمالي عمولات مريم</div>
        <div className="text-4xl font-bold">{fmtMoney(total)}</div>
        <div className="text-xs opacity-80 mt-2">{monthSales.length} مبيعة</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl border border-slate-100 p-4 elev-1">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold">زبائن جدد</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{fmtMoney(newTotal)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{newCount} × {fmtMoney(COMMISSION_NEW)}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-4 elev-1">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-semibold">تجديدات</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{fmtMoney(renewTotal)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{renewCount} × {fmtMoney(COMMISSION_RENEWAL)}</div>
        </div>
      </div>

      {totalNotRenewed > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-500" />أسباب عدم التجديد</span>
            <span className="text-xs text-slate-400">{totalNotRenewed} زبون</span>
          </div>
          <div className="p-4 space-y-2">
            {reasonStats.map(([reason, count]) => {
              const pct = Math.round((count / totalNotRenewed) * 100);
              return (
                <div key={reason}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{reason}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-rose-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden elev-2">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-sm">تفاصيل العمولات</div>
        {monthSales.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">لا توجد عمولات لهذا الشهر</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...monthSales].sort((a, b) => (b.saleDate || '').localeCompare(a.saleDate || '')).map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate flex items-center gap-2">
                    {s.customerName}
                    {s.isRenewal
                      ? <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 rounded">تجديد</span>
                      : <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 rounded">جديد</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{fmtDate(s.saleDate)}</div>
                </div>
                <div className="font-bold text-teal-700">+{fmtMoney(s.commissionAmount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================ Export ================
function buildMetaCSV(customers) {
  const header = ['phone', 'fn', 'ln', 'ct', 'country'];
  const rows = customers.map(c => {
    const parts = (c.name || '').trim().split(/\s+/);
    const fn = parts[0] || '';
    const ln = parts.slice(1).join(' ') || '';
    return [c.phone || '', fn, ln, c.city || '', 'IQ'];
  });
  return [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// بناء CSV لجمهور مُجزّأ (Meta Custom Audience) حسب الشريحة
// segment: 'all' | 'overdue' | 'vip' | 'onetime'
function buildSegmentMetaCSV(customers, sales, segment) {
  const header = ['phone', 'fn', 'ln', 'ct', 'country'];
  const today = todayISO();

  // معلومات مجمّعة لكل رقم
  const info = {};
  for (const s of sales) {
    const p = s.customerPhone;
    if (!info[p]) info[p] = { count: 0, lastExpiry: s.expiryDate, city: s.city, name: s.customerName };
    info[p].count++;
    if (s.expiryDate > info[p].lastExpiry) info[p].lastExpiry = s.expiryDate;
    if (s.saleDate) info[p].city = s.city || info[p].city;
  }

  let chosen = customers;
  if (segment === 'overdue') {
    // انتهى سنسرهم خلال آخر ٦٠ يوماً
    chosen = customers.filter(c => {
      const it = info[c.phone]; if (!it) return false;
      const od = daysBetween(it.lastExpiry, today);
      return od > 0 && od <= 60;
    });
  } else if (segment === 'vip') {
    // اشتروا مرتين فأكثر
    chosen = customers.filter(c => (info[c.phone]?.count || 0) >= 2);
  } else if (segment === 'onetime') {
    // اشتروا مرة واحدة فقط
    chosen = customers.filter(c => (info[c.phone]?.count || 0) === 1);
  }

  const rows = chosen.map(c => {
    const parts = (c.name || '').trim().split(/\s+/);
    return [c.phone || '', parts[0] || '', parts.slice(1).join(' ') || '', c.city || '', 'IQ'];
  });
  return { csv: [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), count: rows.length };
}

function buildSalesCSV(sales) {
  const header = ['التاريخ', 'الاسم', 'الهاتف', 'العنوان', 'المحافظة', 'السنسر', 'السعر', 'التوصيل', 'المنصة', 'تجديد', 'عمولة'];
  const rows = sales.map(s => [
    s.saleDate, s.customerName, s.customerPhone, s.customerAddress, s.city,
    SENSOR_TYPES[s.sensorType]?.name, s.price, s.deliveryFee,
    PLATFORMS[s.platform]?.name, s.isRenewal ? 'نعم' : 'لا', s.commissionAmount
  ]);
  return [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function csvToDataUrl(csv) {
  const withBom = '\uFEFF' + csv;
  const base64 = btoa(unescape(encodeURIComponent(withBom)));
  return `data:text/csv;charset=utf-8;base64,${base64}`;
}

function ExportView({ customers, sales, onRestore, showToast, setPendingConfirm, onDedup, storeSettings, onSaveSettings }) {
  const [cfg, setCfg] = React.useState(storeSettings || { website: '', disclaimer: '', videos: {} });
  React.useEffect(() => { setCfg(storeSettings || { website: '', disclaimer: '', videos: {} }); }, [storeSettings]);
  const setVid = (key, val) => setCfg(c => ({ ...c, videos: { ...c.videos, [key]: val } }));
  const [toast, setToast] = useState(null);
  const showLocal = (m) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const metaCSV = useMemo(() => buildMetaCSV(customers), [customers]);
  const salesCSV = useMemo(() => buildSalesCSV(sales), [sales]);
  const metaUrl = useMemo(() => csvToDataUrl(metaCSV), [metaCSV]);
  const salesUrl = useMemo(() => csvToDataUrl(salesCSV), [salesCSV]);

  // Build full backup JSON
  const backupJson = useMemo(() => {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'LCare Sales',
      counts: { sales: sales.length, customers: customers.length },
      sales,
    }, null, 2);
  }, [sales, customers]);

  const backupUrl = useMemo(() => {
    const base64 = btoa(unescape(encodeURIComponent(backupJson)));
    return `data:application/json;charset=utf-8;base64,${base64}`;
  }, [backupJson]);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); showLocal('تم نسخ البيانات ✓'); }
    catch (e) { showLocal('فشل النسخ'); }
  };

  // Handle backup file import
  const handleImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedSales = Array.isArray(parsed) ? parsed : (parsed.sales || []);
        if (!Array.isArray(importedSales) || importedSales.length === 0) {
          showLocal('الملف فارغ أو غير صالح');
          return;
        }

        // Validate basic shape
        const valid = importedSales.every(s => s && typeof s === 'object' && s.customerPhone);
        if (!valid) {
          showLocal('بنية الملف غير صحيحة');
          return;
        }

        // Confirm before replacing
        setPendingConfirm({
          title: 'استيراد نسخة احتياطية',
          message: `سيتم استبدال جميع البيانات الحالية (${sales.length} مبيعة) بـ ${importedSales.length} مبيعة من الملف.\nهل أنت متأكد؟`,
          variant: 'danger',
          confirmLabel: 'استبدال البيانات',
          action: async () => {
            await onRestore(importedSales);
          },
        });
      } catch (err) {
        showLocal('فشل قراءة الملف: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 brand-grad text-white px-4 py-2 rounded-xl shadow-brand text-sm font-semibold animate-slide-up">
          {toast}
        </div>
      )}

      {/* إعدادات الرسائل التلقائية */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 elev-1">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold">إعدادات الرسائل التلقائية</h2>
            <p className="text-xs text-slate-500">تظهر في رسالة الزبون بعد الشراء (الفيديو + الموقع + إخلاء المسؤولية)</p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">🛒 رابط متجرك (للتجديد)</label>
            <input value={cfg.website} onChange={e => setCfg(c => ({ ...c, website: e.target.value }))} dir="ltr"
              placeholder="https://Store.lcareiq.com"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">📺 رابط صفحة كل سنسر (فيها فيديو التركيب + التجديد)</label>
            <div className="space-y-2">
              {Object.entries(SENSOR_TYPES).map(([key, s]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-md border shrink-0 w-28 text-center font-semibold ${s.color}`}>{s.name}</span>
                  <input value={cfg.videos?.[key] || ''} onChange={e => setVid(key, e.target.value)} dir="ltr"
                    placeholder="https://store.lcareiq.com/#..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-400" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">⚠️ نص إخلاء المسؤولية</label>
            <textarea value={cfg.disclaimer} onChange={e => setCfg(c => ({ ...c, disclaimer: e.target.value }))} rows={3} dir="rtl"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400 leading-relaxed" />
            <p className="text-[10px] text-slate-400 mt-1">💡 يُنصح بمراجعة الصيغة القانونية مع محامٍ.</p>
          </div>

          <button onClick={() => onSaveSettings(cfg)}
            className="w-full brand-grad text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-brand active:scale-95 transition">
            <Save className="w-4 h-4" />حفظ الإعدادات
          </button>
        </div>
      </section>

      {/* صيانة البيانات */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 elev-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Sparkle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold">تنظيف البيانات</h2>
            <p className="text-xs text-slate-500">احذف المبيعات المكررة (نفس الرقم والتاريخ والسنسر)</p>
          </div>
        </div>
        <button onClick={onDedup}
          className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition">
          <Sparkle className="w-4 h-4" />فحص وحذف التكرارات
        </button>
      </section>

      {/* Backup & Restore */}
      <section className="bg-white rounded-2xl border-2 border-emerald-200 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-200/40 to-teal-100/40 rounded-full blur-2xl -z-0" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl brand-grad flex items-center justify-center shrink-0 shadow-brand">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold">النسخة الاحتياطية</h2>
              <p className="text-xs text-slate-500">احفظ بياناتك أو استرجعها بأمان</p>
            </div>
          </div>

          <div className="bg-teal-50/60 rounded-xl p-3 text-xs text-slate-700 space-y-1 mb-4">
            <div>• <b>{sales.length}</b> مبيعة • <b>{customers.length}</b> زبون</div>
            <div>• ملف JSON يحوي كل المعلومات بدقة</div>
            <div>• احفظه في Google Drive أو Telegram أو إيميل لحفظ آمن</div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Export backup */}
            {sales.length > 0 ? (
              <a
                href={backupUrl}
                download={`lcare-backup-${todayISO()}.json`}
                className="brand-grad text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition shadow-brand"
              >
                <Download className="w-4 h-4" />تنزيل نسخة احتياطية كاملة
              </a>
            ) : (
              <button disabled className="bg-slate-200 text-slate-400 py-3 rounded-xl font-bold cursor-not-allowed">
                لا توجد بيانات لحفظها
              </button>
            )}

            {/* Import backup */}
            <label className="bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-teal-50/50 text-teal-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4" />استيراد من ملف نسخة احتياطية
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  handleImport(e.target.files?.[0]);
                  e.target.value = ''; // allow re-import same file
                }}
              />
            </label>

            <button
              onClick={() => copy(backupJson)}
              disabled={sales.length === 0}
              className="text-xs text-slate-500 hover:text-slate-800 py-1.5 flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <Copy className="w-3 h-3" />نسخ محتوى النسخة الاحتياطية
            </button>
          </div>
        </div>
      </section>

      <ExportCard
        title="جمهور Meta المخصص"
        subtitle="CSV متوافق مع إعلانات فيسبوك وانستغرام"
        iconBg="from-blue-500 to-purple-600"
        notes={[
          'الأعمدة: phone, fn, ln, ct, country',
          `${customers.length} زبون بصيغة E.164 (+964...)`,
          'ارفع الملف في Meta Ads Manager ← Audiences ← Custom Audience ← Customer List'
        ]}
        filename={`lcare-meta-audience-${todayISO()}.csv`}
        dataUrl={metaUrl}
        csvContent={metaCSV}
        disabled={customers.length === 0}
        buttonGradient="from-blue-600 to-purple-600"
        onCopy={() => copy(metaCSV)}
      />

      <ExportCard
        title="تقرير المبيعات الكامل"
        subtitle={`${sales.length} عملية مع التفاصيل والعمولات`}
        iconBg="from-slate-700 to-slate-900"
        notes={[
          'التاريخ، الاسم، الهاتف، العنوان، المحافظة',
          'نوع السنسر، السعر، التوصيل، المنصة',
          'نوع البيع (جديد/تجديد) + مبلغ العمولة'
        ]}
        filename={`lcare-sales-${todayISO()}.csv`}
        dataUrl={salesUrl}
        csvContent={salesCSV}
        disabled={sales.length === 0}
        buttonGradient="from-slate-800 to-slate-900"
        onCopy={() => copy(salesCSV)}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
        <div className="font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />ملاحظة</div>
        إذا لم يبدأ التنزيل تلقائياً، استخدم زر "نسخ المحتوى" والصقه في Notes أو Google Sheets.
      </div>
    </div>
  );
}

function ExportCard({ title, subtitle, iconBg, notes, filename, dataUrl, csvContent, disabled, buttonGradient, onCopy }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shrink-0`}>
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1 mb-4">
        {notes.map((n, i) => <div key={i}>• {n}</div>)}
      </div>

      <div className="space-y-2">
        {disabled ? (
          <button disabled className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
            <Download className="w-4 h-4" />لا توجد بيانات
          </button>
        ) : (
          <a href={dataUrl} download={filename}
            className={`w-full bg-gradient-to-l ${buttonGradient} text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition`}>
            <Download className="w-4 h-4" />تنزيل الملف
          </a>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCopy} disabled={disabled}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
            <Copy className="w-3.5 h-3.5" />نسخ المحتوى
          </button>
          <button onClick={() => setShowPreview(v => !v)} disabled={disabled}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
            <FileText className="w-3.5 h-3.5" />{showPreview ? 'إخفاء المعاينة' : 'معاينة'}
          </button>
        </div>

        {showPreview && !disabled && (
          <div className="mt-2">
            <textarea readOnly value={csvContent} dir="ltr" onFocus={(e) => e.target.select()}
              className="w-full h-40 p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono" />
            <p className="text-[10px] text-slate-500 mt-1 text-center">اضغط على الحقل لتحديد كل المحتوى ثم انسخه</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ================ AI Chat Importer ================
function ChatImporter({ onImport, setPendingConfirm, existingCount }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [phase, setPhase] = useState('input'); // input | extracting | review | done
  const [progress, setProgress] = useState({ cur: 0, total: 0 });
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState({});
  const [err, setErr] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result || '');
    reader.readAsText(file);
  };

  const startExtract = async () => {
    if (!text.trim() || text.trim().length < 30) {
      setErr('الصق نص المحادثة أو ارفع ملف .txt أولاً');
      return;
    }
    setErr('');
    setPhase('extracting');
    setProgress({ cur: 0, total: 0 });
    try {
      const result = await extractOrdersFromChat(text, (cur, total) => setProgress({ cur, total }));
      if (!result || result.length === 0) {
        setErr('لم يتم العثور على طلبات في المحادثة. تأكد من نص المحادثة.');
        setPhase('input');
        return;
      }
      // Sort by date
      result.sort((a, b) => (a.saleDate || '').localeCompare(b.saleDate || ''));
      setOrders(result);
      const sel = {};
      result.forEach((_, i) => { sel[i] = true; });
      setSelected(sel);
      setPhase('review');
    } catch (e) {
      let msg = e.message || String(e);
      // Friendly hints for the most common Netlify deployment mistakes
      if (/ANTHROPIC_API_KEY|api key|apikey/i.test(msg)) {
        msg = 'مفتاح الذكاء الاصطناعي غير مضبوط على Netlify. اذهب إلى: Site settings ← Environment variables ← أضِف ANTHROPIC_API_KEY ثم أعد النشر (Trigger deploy).';
      } else if (/404|not found|\/\.netlify\/functions/i.test(msg)) {
        msg = 'الدالة الخادمية غير موجودة. تأكد أن مجلد netlify/functions مرفوع وأن netlify.toml موجود، ثم أعد النشر.';
      } else if (/401|403|authentication|invalid x-api-key/i.test(msg)) {
        msg = 'المفتاح غير صحيح أو منتهي. تحقق من قيمة ANTHROPIC_API_KEY في Netlify.';
      } else if (/429|rate|overloaded|529/i.test(msg)) {
        msg = 'الخدمة مشغولة حالياً (تجاوز الحد). انتظر دقيقة وحاول مرة أخرى.';
      }
      setErr('فشل الاستخراج: ' + msg);
      setPhase('input');
    }
  };

  const toggleAll = (val) => {
    const sel = {};
    orders.forEach((_, i) => { sel[i] = val; });
    setSelected(sel);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const confirmImport = () => {
    const chosen = orders.filter((_, i) => selected[i]);
    if (chosen.length === 0) return;
    setPendingConfirm({
      title: 'تأكيد الاستيراد',
      message: `سيتم إضافة ${chosen.length} طلب إلى قاعدة البيانات.\nالطلبات لأرقام موجودة مسبقاً ستُحسب كتجديد.`,
      variant: 'default',
      confirmLabel: `استيراد ${chosen.length}`,
      action: async () => {
        const n = await onImport(chosen);
        setImportedCount(n || chosen.length);
        setPhase('done');
      },
    });
  };

  const reset = () => {
    setText(''); setFileName(''); setOrders([]); setSelected({});
    setErr(''); setPhase('input'); setImportedCount(0);
  };

  // ---- DONE ----
  if (phase === 'done') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="brand-grad rounded-3xl p-8 text-white text-center shadow-brand">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black">تم الاستيراد بنجاح</h2>
          <p className="text-white/80 mt-2">تمت إضافة {importedCount} طلب إلى قاعدة البيانات</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-5 mt-4 elev-2 text-center">
          <p className="text-sm text-slate-600 mb-4">
            الزبائن الجدد ظهروا في تبويب "الزبائن"، وتقدر تصدّرهم الآن لـ Meta من تبويب "تصدير".
          </p>
          <button onClick={reset} className="brand-grad text-white px-6 py-2.5 rounded-2xl font-bold shadow-brand active:scale-95 transition">
            استيراد محادثة أخرى
          </button>
        </div>
      </div>
    );
  }

  // ---- EXTRACTING ----
  if (phase === 'extracting') {
    const pct = progress.total ? Math.round((progress.cur / progress.total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 elev-2 text-center">
          <div className="w-16 h-16 brand-grad rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-brand">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">الذكاء الاصطناعي يحلل المحادثة...</h2>
          <p className="text-sm text-slate-400 mt-1">يستخرج أسماء الزبائن والأرقام والعناوين والأجهزة</p>
          <div className="mt-5 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="brand-grad h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2 font-semibold">
            {progress.total ? `جزء ${progress.cur} من ${progress.total} (${pct}%)` : 'جاري التحضير...'}
          </p>
        </div>
      </div>
    );
  }

  // ---- REVIEW ----
  if (phase === 'review') {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <ListChecks className="w-[18px] h-[18px] text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-[15px] text-slate-900 leading-tight">مراجعة الطلبات المستخرجة</h2>
              <p className="text-xs text-slate-400">تم العثور على {orders.length} طلب — راجعها قبل الاستيراد</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => toggleAll(true)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold">تحديد الكل</button>
            <button onClick={() => toggleAll(false)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold">إلغاء الكل</button>
            <span className="text-xs text-slate-500 mr-auto font-semibold">{selectedCount} محدد</span>
          </div>
        </div>

        <div className="space-y-2">
          {orders.map((o, i) => {
            const sensor = SENSOR_TYPES[o.sensorType] || SENSOR_TYPES.libre2;
            const isSel = selected[i];
            return (
              <button key={i} onClick={() => setSelected(s => ({ ...s, [i]: !s[i] }))}
                className={`w-full text-right rounded-2xl border-2 p-3.5 transition ${isSel ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200 bg-white opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${isSel ? 'brand-grad' : 'bg-slate-200'}`}>
                    {isSel && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-[15px] truncate">{o.name || 'بدون اسم'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${sensor.color}`}>{sensor.name}</span>
                      {o.quantity > 1 && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-bold">×{o.quantity}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{normalizePhone(o.phone)}</span>
                      {o.saleDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(o.saleDate)}</span>}
                    </div>
                    {o.address && <div className="text-xs text-slate-400 mt-1 truncate">{o.address}</div>}
                    <div className="text-xs font-bold text-teal-700 mt-1">
                      {fmtMoney(o.price)}{(o.deliveryFee && Number(o.deliveryFee) > 0) ? ` + ${fmtMoney(o.deliveryFee)} توصيل` : ' • توصيل مجاني'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-20 md:bottom-4 flex gap-2 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pt-3 pb-1">
          <button onClick={reset} className="px-4 py-3.5 rounded-2xl font-bold text-sm bg-white border border-slate-200 text-slate-600">إلغاء</button>
          <button onClick={confirmImport} disabled={selectedCount === 0}
            className="flex-1 brand-grad text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-brand active:scale-[0.99] transition disabled:opacity-50">
            <Check className="w-4 h-4" />استيراد {selectedCount} طلب
          </button>
        </div>
      </div>
    );
  }

  // ---- INPUT ----
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <section className="bg-white rounded-3xl border border-slate-100 p-5 elev-2">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl brand-grad flex items-center justify-center shadow-brand">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[15px] text-slate-900 leading-tight">استيراد محادثة واتساب بالذكاء الاصطناعي</h2>
            <p className="text-xs text-slate-400">يستخرج كل الزبائن والطلبات دفعة واحدة</p>
          </div>
        </div>

        <div className="bg-teal-50/60 rounded-2xl p-3.5 text-xs text-slate-600 leading-relaxed mb-4 space-y-1.5">
          <div className="font-bold text-slate-700 flex items-center gap-1"><Sparkle className="w-3.5 h-3.5 text-teal-600" />كيف يعمل؟</div>
          <div>١) من واتساب: افتح المحادثة ← الخيارات ← تصدير الدردشة ← "بدون وسائط"</div>
          <div>٢) افتح الملف وانسخ النص، أو ارفع ملف <code className="bg-white px-1 rounded">.txt</code> مباشرة هنا</div>
          <div>٣) الذكاء الاصطناعي يستخرج: الاسم، الرقم، العنوان، نوع الجهاز، السعر، التاريخ</div>
          <div>٤) راجع القائمة ← استورد ← صدّرهم لـ Meta من تبويب "تصدير"</div>
        </div>

        {/* Upload .txt */}
        <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-teal-400 hover:bg-teal-50/40 transition cursor-pointer mb-3">
          <input type="file" accept=".txt,text/plain" className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value=''; }} />
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-2">
            <FileUp className="w-6 h-6 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-700">{fileName || 'ارفع ملف المحادثة (.txt)'}</div>
          <div className="text-xs text-slate-400 mt-1">أو الصق النص في الأسفل</div>
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="rtl"
          rows={6}
          placeholder="أو الصق نص المحادثة كاملاً هنا..."
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-2xl p-3.5 leading-relaxed font-cairo focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
        />
        {text && <div className="text-[11px] text-slate-400 mt-1.5">{text.length.toLocaleString('ar-IQ')} حرف • ~{Math.ceil(text.length/14000)} جزء للمعالجة</div>}

        {err && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}

        <button onClick={startExtract} disabled={!text.trim()}
          className="w-full brand-grad text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-brand active:scale-[0.99] transition disabled:opacity-50 mt-4">
          <Bot className="w-4 h-4" />استخراج الطلبات بالذكاء الاصطناعي
        </button>
      </section>

      {existingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed">
          <div className="font-bold mb-0.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />ملاحظة</div>
          عندك حالياً {existingCount} مبيعة. الطلبات المستوردة ستُضاف إليها (الأرقام المكررة في نفس اليوم تُتجاهل تلقائياً).
        </div>
      )}
    </div>
  );
}

// ================ Confirm Dialog ================
function ConfirmDialog({ title, message, variant = 'default', confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', onConfirm, onCancel }) {
  const isDanger = variant === 'danger';

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel} dir="rtl">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${isDanger ? 'bg-red-100' : 'bg-emerald-100'}`}>
          {isDanger ? <Trash2 className="w-6 h-6 text-red-600" /> : <AlertCircle className="w-6 h-6 text-emerald-600" />}
        </div>
        <h3 className="font-bold text-center text-lg mb-2">{title}</h3>
        <p className="text-sm text-slate-600 text-center whitespace-pre-line mb-5 leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`py-2.5 rounded-xl font-bold text-sm transition ${isDanger ? 'bg-red-600 hover:bg-red-700 text-white' : 'brand-grad text-white shadow-brand'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
