# نظام تصميم أكاديمية وادي دجلة — v1 (Phase 3)

> **الفلسفة:** Calm-Premium. كل بكسل له وظيفة. الحركة توصّل معنى. العربي أولاً.
> أي عنصر UI جديد يُبنى من المكونات دي — إنشاء بديل مخصص لمكوّن موجود = مخالفة نظام.

## 1) Tokens (المصدر: `src/ui/theme.css`)
- **الأسطح:** `--void → --s1` (5 درجات). الحدود `--line/-2/-3` (الـ-3 لحالة hover حصريًا).
- **الذهبي:** `--g0..g3`. **قاعدة اقتصاد الذهبي:** الذهبي المشبع لـ3 استخدامات فقط: (1) الخطوة التالية للمستخدم، (2) هوية العلامة، (3) هوية الـBoss. **الإنجاز/النجاح = `--ready` الأخضر دائمًا.**
- **الدلالية:** ready (نجاح) · attn (تنبيه) · risk (خطر/هدّام) · info · escalate. اللون لا يُستخدم وحده أبدًا — معه نص أو أيقونة.
- **المسافات:** سلم 8px (`--sp-1..9`). **الطباعة:** سلم 8 درجات، أساس 16px، line-height 1.7-1.8.
- **🔴 قاعدة العربي:** ممنوع `letter-spacing` أو `uppercase` على أي نص عربي (خط متصل — التباعد يفكك الوصلات). التمييز الهرمي بالوزن والحجم واللون فقط.

## 2) مكتبة المكونات (13 مكون — `src/ui/primitives/`)
| المكوّن | الاستخدام | ملاحظة |
|---|---|---|
| `Button` | primary (فعل الشاشة الواحد) / ghost (ثانوي) | ≥44px، hover/active/disabled من `.btn` |
| `OptionButton` | **كل** إجابات الأسئلة (درس/امتحان/Boss) | حالات idle/correct/wrong/dim + `arena` |
| `FeedbackBlock` | ما بعد الإجابة: شرح + زر متابعة | يملك aria-live + نقل الفوكس تلقائيًا |
| `ScreenHeader` | هيدر كل الشاشات الداخلية | onBack/leading/rail/trailing، tone=arena للـBoss |
| `ProgressRail` | تقدّم المراحل/الأسئلة | `emphasis` للـBoss |
| `Callout` | objective/note/warning/summary | لا يُستخدم للأخطاء الهدّامة |
| `ConfirmDialog` | **إلزامي قبل أي فعل هدّام** | Escape يلغي، الفوكس على التأكيد |
| `Toast` | تأكيد نجاح أي mutation إداري | role=status، يختفي تلقائيًا |
| `StatusBadge` | حالة كيان (معطّل/دورك هنا/…) | 6 نغمات دلالية |
| `Card` / `Eyebrow` / `EmptyState` / `SkillBar` / `Skeleton` | الأسطح والفراغ والتحميل | Skeleton محجوز لمنصات Phase 4+ |
| `PricesNote` | تنويه الأسعار الإلزامي | مع أي مثال مالي |

## 3) لغة التفاعل الواحدة (`.btn/.option/.field/.pill/.icon-btn/.back-btn/.row-hover`)
كل عنصر تفاعلي: **hover** (رفع حد `line-3` + سطح أفتح، 150ms) · **focus-visible** (outline ذهبي) · **active** (scale .97) · **disabled** (opacity .4) · **هدف ≥44px**. الحالات في CSS classes لأن الـpseudo-states مستحيلة inline — التخطيط الساكن يبقى في المكوّن.

## 4) قرار معماري: تركيب بدل QuestionRunner واحد
امتحان الوحدة والـBoss والدرس **آلات حالة مختلفة** (تسجيل نتيجة / عدّ أخطاء / مراحل). مكوّن واحد بأعلام تكوين = تجريد مسرّب. النظام يوفّر **القطع الموحّدة** (OptionButton + FeedbackBlock + ProgressRail + ScreenHeader) وكل تدفق يملك حالته — نفس الاتساق البصري بصفر هشاشة.

## 5) Anti-patterns (مرفوضة في المراجعة)
letter-spacing على عربي · إيموجي كأيقونة (lucide فقط) · فعل هدّام بلا ConfirmDialog · mutation بلا Toast · ذهبي مشبع للإنجازات · لون بلا نص · هدف تفاعلي <44px · مقارنة اسم دور في UI (`can()` فقط) · أرقام مدة inline (presets `ui/motion.ts` فقط).
