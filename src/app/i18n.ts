/**
 * Product language — the CHROME can speak English; the LEARNING never does.
 *
 * THE SPLIT IS THE WHOLE POINT
 *   Product language (this file): navigation, actions, status, progress,
 *   readiness — the words that frame the work.
 *   Learning language (src/content/*): lessons, SOPs, scenarios, questions,
 *   membership rules — ALWAYS Arabic, never keyed here, never translated.
 *   A Membership rule that exists in two languages is a rule that can drift
 *   into two meanings, and the trainee acts on the Arabic one at the desk.
 *
 * DIRECTION STAYS RTL. Even in English mode the page keeps `dir="rtl"`,
 * because the lesson body underneath is Arabic and it is the reason the
 * screen exists. Short English labels render correctly inside an RTL block
 * via the Unicode bidi algorithm — verified against LoginView, which already
 * ships English copy. Flipping the document direction to suit the chrome
 * would fight the content on every mixed screen.
 */
import { useSyncExternalStore } from 'react';

export type Lang = 'ar' | 'en';

const KEY = 'wda.lang.v1';

/** UI strings only. Anything a trainee must ACT on stays in content/. */
const DICT = {
  // shell / navigation
  'nav.academy':    { ar: 'الأكاديمية',        en: 'Dashboard' },
  'nav.journey':    { ar: 'رحلتي',             en: 'Learning Journey' },
  /* 🔴 ONE WORD, ONE MEANING. This tab said «Progress», opened a screen headed
     «Skills», and the profile called a third thing «Progress» as well: one word
     for three places, in a product whose whole claim is that the trainee always
     knows where they are. The tab is now named after the screen it opens. */
  'nav.skills':     { ar: 'مهاراتك',           en: 'Skills' },
  'nav.trainer':    { ar: 'المدرب',            en: 'Trainer' },
  'nav.manager':    { ar: 'المدير',            en: 'Manager' },
  'nav.admin':      { ar: 'الإدارة',           en: 'Admin' },
  'brand.name':     { ar: 'أكاديمية وادي دجلة', en: 'Wadi Degla Academy' },
  // identity
  'greet.morning':  { ar: 'صباح الخير',        en: 'Good morning' },
  'greet.evening':  { ar: 'مساء الخير',        en: 'Good evening' },
  'menu.profile':   { ar: 'مركز الهوية',       en: 'Profile' },
  'menu.signout':   { ar: 'تسجيل الخروج',      en: 'Sign out' },
  // action centre
  'ac.none':        { ar: 'مفيش حاجة محتاجة انتباهك دلوقتي.', en: 'Nothing needs your attention right now.' },
  'ac.label.none':  { ar: 'مفيش حاجة محتاجة انتباهك',        en: 'Nothing needs your attention' },
  // welcome
  'wel.eyebrow':    { ar: 'أكاديمية عمليات العضويات · وادي دجلة', en: 'Membership Operations Academy · Wadi Degla' },
  'wel.title':      { ar: 'أهلاً بيك في فريق العضويات.', en: 'Welcome to the Membership team.' },
  // path / today
  'path.mission':   { ar: 'مهمة النهارده',      en: "Today's mission" },
  'path.alldone':   { ar: 'خلّصت كل حاجة متاحة', en: "You've finished everything available" },
  'path.needswork': { ar: 'مطلوب تحسين — راجع الدروس المحددة', en: 'Improvement needed — review the flagged lessons' },
  'path.reviewunit':{ ar: 'راجع الوحدة',        en: 'Review the unit' },
  'path.submit':    { ar: 'قدّم للمراجعة',       en: 'Submit for review' },
  'path.lessons':   { ar: 'دروس',               en: 'lessons' },
  // journey
  'jr.header':      { ar: 'رحلة التأهيل · 60 يوم', en: 'Qualification journey · 60 days' },
  'jr.distance':    { ar: 'مسافتك على المسار',   en: 'Distance covered' },
  'jr.phases':      { ar: 'مراحل',              en: 'phases' },
  'jr.inphase':     { ar: 'وفي مرحلتك دلوقتي:',  en: 'In your current phase:' },
  'jr.nextgate':    { ar: 'البوابة الجاية',      en: 'Next gate' },
  'jr.youarehere':  { ar: 'أنت هنا',            en: 'You are here' },
  'jr.approved':    { ar: 'معتمدة',             en: 'Approved' },
  'jr.open':        { ar: 'افتح',               en: 'Open' },
  // approved product vocabulary — actions & status
  'act.continue':   { ar: 'كمّل',                en: 'Continue' },
  'act.start':      { ar: 'ابدأ',                en: 'Start' },
  'act.review':     { ar: 'راجع',                en: 'Review' },
  'act.viewresult': { ar: 'شوف النتيجة',         en: 'View result' },
  'act.contlesson': { ar: 'كمّل الدرس',           en: 'Continue lesson' },
  'act.retry':      { ar: 'حاول تاني',           en: 'Retry' },
  'st.complete':    { ar: 'مكتملة',              en: 'Complete' },
  'st.inprogress':  { ar: 'شغّال فيها دلوقتي',    en: 'In progress' },
  'st.locked':      { ar: 'مقفولة',              en: 'Locked' },
  'st.available':   { ar: 'جاهزة تبدأ',          en: 'Available' },
  'st.pending':     { ar: 'مستنية المدرب',       en: 'Pending' },
  'st.passed':      { ar: 'ناجح',                en: 'Passed' },
  'st.failed':      { ar: 'محتاج إعادة',         en: 'Failed' },
  // dashboard / progress
  'db.readiness':   { ar: 'الجاهزية',            en: 'Readiness' },
  'db.completion':  { ar: 'نسبة التعلّم',         en: 'Completion' },
  'db.performance': { ar: 'الأداء',              en: 'Performance' },
  'db.nextstep':    { ar: 'الخطوة الجاية',       en: 'Next step' },
  'db.currentphase':{ ar: 'المرحلة الحالية',     en: 'Current phase' },
  // phase status — resolved INSIDE the component; STATUS_META stays static
  'ps.completed':   { ar: 'مكتملة',              en: 'Complete' },
  'ps.waiting':     { ar: 'في انتظار مدربك',     en: 'Pending review' },
  'ps.inprogress':  { ar: 'شغّال فيها دلوقتي',    en: 'In progress' },
  'ps.available':   { ar: 'جاهزة تبدأ',          en: 'Available' },
  'ps.locked':      { ar: 'مقفولة',              en: 'Locked' },
  'ps.planned':     { ar: 'في البرنامج',         en: 'In programme' },
  // journey shell
  'jr.phaseof':     { ar: 'المرحلة',             en: 'Phase' },
  'jr.of':          { ar: 'من',                  en: 'of' },
  'jr.done':        { ar: 'اكتملت',              en: 'Complete' },
  'jr.daysleft':    { ar: 'فاضل',                en: 'Remaining' },
  'jr.days':        { ar: 'يوم',                 en: 'days' },
  'jr.unitsapp':    { ar: 'من الوحدات معتمدة',   en: 'of units approved' },
  'jr.day':         { ar: 'اليوم',               en: 'Day' },
  // profile — product shell
  'pf.title':       { ar: 'مركز الهوية',          en: 'Profile' },
  'pf.status':      { ar: 'حالتك دلوقتي',         en: 'Current status' },
  'pf.evidence':    { ar: 'الدليل',               en: 'Evidence' },
  'pf.approved':    { ar: 'المعتمد',              en: 'Approved' },
  'pf.unitsapp':    { ar: 'وحدات معتمدة',         en: 'Units approved' },
  'pf.lessonsdone': { ar: 'الدروس المكتملة',      en: 'Lessons completed' },
  'pf.bytrainer':   { ar: 'باعتماد المدرب',       en: 'By trainer approval' },
  'pf.fromtrainer': { ar: 'من المدرب',            en: 'From trainer' },
  'pf.lastreview':  { ar: 'آخر تقييم',            en: 'Last review' },
  'pf.noreview':    { ar: 'لسه مفيش تقييم',       en: 'No review yet' },
  'pf.personal':    { ar: 'البيانات الشخصية',     en: 'Personal details' },
  'pf.name':        { ar: 'الاسم',                en: 'Name' },
  'pf.branch':      { ar: 'الفرع',                en: 'Branch' },
  'pf.empid':       { ar: 'رقم الموظف',           en: 'Employee ID' },
  'pf.trainer':     { ar: 'المدرب',               en: 'Trainer' },
  'pf.assigned':    { ar: 'المدرب المسؤول',       en: 'Assigned trainer' },
  'pf.certs':       { ar: 'الشهادات',             en: 'Certificates' },
  // skills — product shell only (the level explanation stays Arabic: it teaches)
  'sk.title':       { ar: 'مهاراتك',                en: 'Skills' },
  'sk.aria':        { ar: 'المهارات اللي بتبنيها',  en: "Skills you're building" },
  'sk.notstarted':  { ar: 'لسه مبدأتش',             en: 'Not started' },
  'sk.gotofirst':   { ar: 'روح لأول درس',           en: 'Start first lesson' },
  // assessment — product shell only (feedback & framing stay Arabic: they teach)
  'ex.backtopath':  { ar: 'ارجع للمسار',           en: 'Back to path' },
  'ex.retry':       { ar: 'حاول تاني',             en: 'Retry' },
  'ex.next':        { ar: 'السؤال الجاي',          en: 'Next question' },
  'ex.seeresult':   { ar: 'شوف نتيجتك',            en: 'View result' },
  'ex.unlocked':    { ar: 'اتفتحلك:',              en: 'Unlocked:' },
  // language switch
  'lang.switch':    { ar: 'English',            en: 'العربية' },
  'lang.aria':      { ar: 'Switch product language to English', en: 'تبديل لغة المنصة إلى العربية' },

  /* ── sprint 06 · phase 2 — PRODUCT CHROME ONLY ─────────────────────────────
     Every entry below is an interface string: a label, an action, a system
     state, or copy ABOUT the programme. Not one of them is learning content —
     no lesson text, no question, no scenario, no practical task, no rule. Those
     stay Arabic in both modes, inside their declared islands, because a
     Membership rule that exists in two languages can drift into two meanings.

     Vocabulary is fixed by the existing dictionary above (Dashboard · Learning
     Journey · Skills · Unit · Phase · Trainer · Approved · Readiness) and the
     screens reuse it rather than inventing synonyms. */

  /* dashboard */
  'db.mission':     { ar: 'مهمة النهارده',       en: "Today's mission" },
  'db.contlesson':  { ar: 'كمّل الدرس',           en: 'Continue lesson' },
  'db.startexam':   { ar: 'ابدأ الامتحان',        en: 'Start the exam' },
  'db.contunit':    { ar: 'كمّل',                 en: 'Continue' },
  'db.examof':      { ar: 'امتحان وحدة',          en: 'Unit exam —' },
  'db.examintro':   { ar: 'خلّصت دروس الوحدة — الامتحان بيخلط كل اللي اتعلّمته.',
                      en: 'Unit lessons done — the exam mixes everything you learned.' },
  'db.nextunit':    { ar: 'الوحدة الجاية',        en: 'Next unit' },
  'db.unlockrule':  { ar: 'تُفتح بعد اعتماد الوحدة الحالية من المدرب',
                      en: 'Opens once your trainer approves the current unit' },
  'db.reviewunit':  { ar: 'راجع الوحدة',          en: 'Review the unit' },
  'db.submitrev':   { ar: 'قدّم للمراجعة',        en: 'Submit for review' },
  'db.waiting':     { ar: 'الوحدة وصلت لمدربك خلاص ومستنية تقييمه — مش محتاج تعمل حاجة. هتلاقي الخطوة الجاية هنا أول ما يخلّص.',
                      en: 'The unit reached your trainer and is waiting for their assessment — nothing for you to do. Your next step appears here as soon as they finish.' },
  'db.retrysubmit': { ar: 'الامتحان محفوظ. حصل تعطّل بسيط قبل ما الوحدة توصل لمدربك — دوس تاني وهتوصله.',
                      en: 'Your exam is saved. A hiccup stopped the unit reaching your trainer — tap again and it will.' },
  'db.nostep':      { ar: 'مفيش خطوة مطلوبة دلوقتي. لو مستني اعتماد مدرب، هيظهر هنا أول ما يتحرّك.',
                      en: 'Nothing is required right now. If a trainer approval is pending, it shows up here the moment it moves.' },
  'db.meanwhile':   { ar: 'ولو حابب تستغل الوقت: راجع «مهاراتك» من فوق، أو ارجع لأي درس عدّى.',
                      en: 'To use the time: open Skills above, or revisit any lesson you have finished.' },
  'db.nosave':      { ar: 'الحفظ المحلي مش شغّال دلوقتي — تقدّمك شغّال في الجلسة دي بس. بلّغ المدرب.',
                      en: 'Local saving is unavailable — your progress lasts for this session only. Tell your trainer.' },
  'db.lessonsof':   { ar: 'دروس',                 en: 'lessons' },
  'db.committoday': { ar: 'التزامك من درس النهارده', en: "Your commitment from today's lesson" },
  'db.commitysdy':  { ar: 'التزامك من إمبارح',    en: 'Your commitment from yesterday' },
  'db.commitdays':  { ar: 'التزامك من',           en: 'Your commitment from' },
  'db.daysago':     { ar: 'أيام',                 en: 'days ago' },

  /* skills */
  'sk.headline':    { ar: 'المهارات اللي بتبنيها.', en: 'The skills you are building.' },
  'sk.sub':         { ar: 'كل درس بيحرّك مهارة — والمهارة بتتبني على 3 مستويات: بدأتها، بتتمرن عليها، اتقنتها.',
                      en: 'Every lesson moves a skill, and each skill builds across 3 levels: started, practising, mastered.' },

  /* first run */
  'wc.where':       { ar: 'إنت فين؟',             en: 'Where are you?' },
  'wc.wherebody':   { ar: 'ده برنامج تأهيلك الرسمي لمكتب العضويات — المكان اللي بيحوّل العميل لعضو في وادي دجلة.',
                      en: 'This is your official qualification programme for the Membership office — where a customer becomes a member of Wadi Degla.' },
  'wc.learn':       { ar: 'هتتعلم إيه؟',          en: 'What will you learn?' },
  'wc.time':        { ar: 'هتاخد قد إيه؟',        en: 'How long does it take?' },
  'wc.timebody':    { ar: 'الدرس دقايق معدودة. خطوة صغيرة كل مرة — وإنت اللي بتتحكم في سرعتك.',
                      en: 'A lesson takes minutes. One small step at a time, at your own pace.' },
  'wc.ready':       { ar: 'إمتى تبقى جاهز؟',      en: 'When are you ready?' },
  'wc.intro':       { ar: 'مش مطلوب منك تعرف أي حاجة النهارده — المنصة دي معمولة عشان تاخدك من الصفر لحد ما تقف قدام أول عميل بثقة.',
                      en: 'You are not expected to know anything today — this platform takes you from zero to facing your first customer with confidence.' },
  'wc.storage':     { ar: 'تقدّمك بيتحفظ على الجهاز والمتصفح ده — كمّل تدريبك من نفس الجهاز دايمًا.',
                      en: 'Your progress is saved on this device and browser — always continue from the same one.' },
  'wc.startfirst':  { ar: 'ابدأ أول درس',         en: 'Start the first lesson' },
  /* Interpolated: the numbers come from the curriculum, never from the copy. */
  'wc.learnbody':   { ar: 'درس قصير في', en: 'short lessons across' },
  'wc.learnunits':  { ar: 'وحدات، موزّعة على', en: 'units, spread over' },
  'wc.learnphases': { ar: 'مراحل — كل درس بيجاوب سؤال حقيقي هيقابلك قدام عميل. مش حفظ… قرارات.',
                      en: 'phases — every lesson answers a real question you will face in front of a customer. Not memorising… deciding.' },
  'wc.readybody1':  { ar: 'لما تعدّي تحدّي المستوى', en: 'Once you pass the Level' },
  'wc.readybody2':  { ar: '— يوم عمل كامل بعملاء حقيقيين — تبقى جاهز فعلاً لأول عميل ليك.',
                      en: 'challenge — a full working day with real customers — you are genuinely ready for your first customer.' },

  /* quick review */
  'rt.next':        { ar: 'التالي',               en: 'Next' },
  'rt.donetoday':   { ar: 'كمّل ليوم النهارده',    en: "Done for today" },

  /* learning journey */
  'jr.allapproved': { ar: 'كل الوحدات معتمدة',   en: 'All units approved' },
  'jr.working':     { ar: 'شغّال فيها دلوقتي',    en: 'Working on it now' },
  'jr.waiting':     { ar: 'في انتظار مدربك',      en: 'Waiting for your trainer' },
  'jr.readystart':  { ar: 'جاهزة تبدأ',           en: 'Ready to start' },
  'jr.locked':      { ar: 'مقفولة',               en: 'Locked' },
  'jr.complete':    { ar: 'مكتملة',               en: 'Complete' },
  'jr.inprogram':   { ar: 'في البرنامج',          en: 'In the programme' },
  'jr.passed':      { ar: 'متعدّي',                en: 'Passed' },
  'jr.start':       { ar: 'ابدأ',                 en: 'Start' },
  'jr.lessons':     { ar: 'دروس',                 en: 'lessons' },
  'jr.phasesof':    { ar: 'مراحل',                en: 'phases' },
  'jr.whatnext':    { ar: 'هتقدر تعمل إيه بعدها', en: 'What you will be able to do' },
  'jr.buildsoon':   { ar: 'المرحلة دي جزء رسمي من البرنامج · محتواها التفاعلي لسه تحت الإنشاء.',
                      en: 'This phase is an official part of the programme · its interactive content is still being built.' },
  'jr.reviewcta':   { ar: 'ابدأ المراجعة',        en: 'Start the review' },
  'jr.reviewtitle': { ar: 'مراجعة القرار المهني', en: 'Professional decision review' },
  'jr.reviewblurb': { ar: 'الموقف، قرارك، القاعدة وراه، وصّلته إزاي، وهتعمل إيه مختلف.',
                      en: 'The situation, your decision, the rule behind it, how you delivered it, and what you would do differently.' },
  'jr.readycta':    { ar: 'افتح التقييم',         en: 'Open the assessment' },
  'jr.readytitle':  { ar: 'تقييم الجاهزية المهنية', en: 'Professional readiness assessment' },
  'jr.readyblurb':  { ar: 'سؤال واحد: تقدر تمثّل وادي دجلة لوحدك بكرة الصبح؟ شوف الأدلة، واللي لسه بيمنع الاعتماد.',
                      en: 'One question: could you represent Wadi Degla on your own tomorrow morning? See the evidence, and what still blocks certification.' },

  /* profile */
  'pf.staffno':     { ar: 'رقم الموظف',           en: 'Staff number' },
  'pf.lastassess':  { ar: 'آخر تقييم',            en: 'Last assessment' },
  'pf.noassess':    { ar: 'لسه مفيش تقييم',       en: 'No assessment yet' },
  'pf.programdone': { ar: 'اكتمل البرنامج',       en: 'Programme complete' },
  'pf.alldone':     { ar: 'خلّصت كل المتاح دلوقتي', en: 'You have finished everything available' },
  'pf.underreview': { ar: 'مدربك بيراجع شغلك',    en: 'Your trainer is reviewing your work' },
  'pf.resume':      { ar: 'كمّل',                  en: 'Continue' },
  'pf.exam':        { ar: 'امتحان',               en: 'Exam —' },
  'pf.submit':      { ar: 'قدّم للمراجعة',        en: 'Submit for review —' },
  'pf.improve':     { ar: 'حسّن',                  en: 'Improve' },

  /* ── staff · organisation structure ─────────────────────────────────────── */
  'og.title':       { ar: 'هيكل المنظمة',         en: 'Organisation structure' },
  'og.intro':       { ar: 'المنطقة بتضم فروع، والفرع بيضم مدرب وموظفين. أي تعديل هنا بيغيّر مين يشوف إيه فورًا.',
                      en: 'An area holds branches; a branch holds a trainer and staff. Any change here changes who sees what, immediately.' },
  'og.area':        { ar: 'منطقة',                en: 'Area' },
  'og.newarea':     { ar: 'منطقة جديدة',          en: 'New area' },
  'og.areamanager': { ar: 'مدير المنطقة',         en: 'Area manager' },
  'og.nomanager':   { ar: 'بلا مدير',             en: 'No manager' },
  'og.unassigned':  { ar: '— مش متعيّن —',         en: '— Unassigned —' },
  'og.pickarea':    { ar: '— اختار منطقة —',      en: '— Choose an area —' },
  'og.noarea':      { ar: '— بلا منطقة —',        en: '— No area —' },
  'og.orphans':     { ar: 'فروع بلا منطقة',       en: 'Branches with no area' },
  'og.orphanshint': { ar: 'الفروع دي مش تابعة لأي منطقة — يعني مفيش مدير منطقة بيشوفها.',
                      en: 'These branches belong to no area — so no area manager can see them.' },
  'og.nobranches':  { ar: 'مفيش فروع في المنطقة دي.', en: 'No branches in this area.' },
  'og.archive':     { ar: 'أرشفة',                en: 'Archive' },
  'og.restore':     { ar: 'استرجاع',              en: 'Restore' },
  'og.archived':    { ar: 'مؤرشفة',               en: 'Archived' },
  'og.archivednote':{ ar: 'الأرشفة شالت وصوله للبيانات', en: 'Archiving removed their access to the data' },
  'og.renameaera':  { ar: 'غيّر اسم',              en: 'Rename' },
  'og.newnamefor':  { ar: 'اسم جديد لمنطقة',      en: 'New name for area' },
  'og.mgrofarea':   { ar: 'مدير منطقة',           en: 'Manager of area' },
  'og.areaofbranch':{ ar: 'منطقة فرع',            en: 'Area of branch' },
  'og.assignarea':  { ar: 'عيّن منطقة لفرع',       en: 'Assign an area to branch' },
  'og.areaname':    { ar: 'اسم المنطقة',          en: 'Area name' },
  'og.newareaname': { ar: 'اسم المنطقة الجديدة',  en: 'New area name' },
  'og.confirm':     { ar: 'تأكيد',                en: 'Confirm' },
  'og.cancel':      { ar: 'إلغاء',                en: 'Cancel' },
  'og.savename':    { ar: 'حفظ الاسم',            en: 'Save name' },
  'og.branches':    { ar: 'فرع',                  en: 'branches' },
  'og.staff':       { ar: 'موظف',                 en: 'staff' },
  'og.trainers':    { ar: 'مدرب',                 en: 'trainers' },
  'og.noareas':     { ar: 'مفيش مناطق لسه',       en: 'No areas yet' },
  'og.noareasbody': { ar: 'ابدأ بإنشاء منطقة، وبعدها عيّن ليها فروع ومدير.',
                      en: 'Start by creating an area, then assign branches and a manager to it.' },

  /* ── staff · readiness report ───────────────────────────────────────────── */
  'rr.title':       { ar: 'تقرير الجاهزية',       en: 'Readiness report' },
  'rr.noaccess':    { ar: 'مفيش صلاحية لعرض التقرير ده', en: 'No permission to view this report' },
  'rr.summary':     { ar: 'الخلاصة التنفيذية —',  en: 'Executive summary —' },
  'rr.operational': { ar: 'جاهزية تشغيلية',       en: 'operational readiness' },
  'rr.unitsapp':    { ar: 'وحدات معتمدة',         en: 'units approved' },
  'rr.assessments': { ar: 'تقييمات',              en: 'assessments' },
  'rr.dimensions':  { ar: 'أبعاد التقييم',        en: 'Assessment dimensions' },
  'rr.strengths':   { ar: 'نقاط القوة',           en: 'Strengths' },
  'rr.development': { ar: 'مجالات التطوير',       en: 'Development areas' },
  'rr.critical':    { ar: 'حرج',                  en: 'Critical' },
  'rr.suggestion':  { ar: 'المقترح:',             en: 'Suggested:' },
  'rr.decision':    { ar: 'التوصية والقرار',      en: 'Recommendation and decision' },
  'rr.trainerrec':  { ar: 'توصية المدرب',         en: "Trainer's recommendation" },
  'rr.managerdec':  { ar: 'قرار المدير النهائي',  en: "Manager's final decision" },
  'rr.pending':     { ar: 'لسه',                  en: 'Pending' },
  'rr.waitprogram': { ar: 'مستني اكتمال البرنامج', en: 'Waiting for the programme to finish' },
  'rr.readywork':   { ar: 'جاهز للعمل',           en: 'Ready for work' },
  'rr.extend':      { ar: 'تمديد',                en: 'Extend' },
  'rr.notready':    { ar: 'مش جاهز',              en: 'Not ready' },
  'rr.readycond':   { ar: 'جاهز بشروط',           en: 'Ready with conditions' },
  'rr.extendlong':  { ar: 'تمديد التدريب',        en: 'Extend the training' },
  'rr.risklow':     { ar: 'مخاطرة منخفضة',        en: 'Low risk' },
  'rr.riskmed':     { ar: 'مخاطرة متوسطة',        en: 'Medium risk' },
  'rr.riskhigh':    { ar: 'مخاطرة عالية',         en: 'High risk' },
  'rr.readyline':   { ar: 'المتدرب جاهز يدير العمل اليومي في المكتب باستقلالية مهنية.',
                      en: 'The trainee can run the daily work of the office with professional independence.' },
  'rr.condline':    { ar: 'جاهز للعمل اليومي مع متابعة على نقاط محدّدة في أول فترة.',
                      en: 'Ready for daily work, with follow-up on specific points in the first period.' },
  'rr.extendline':  { ar: 'محتاج أيام إضافية بإشراف قبل الاستقلالية.',
                      en: 'Needs additional supervised days before working independently.' },
  'rr.notreadyline':{ ar: 'فيه فجوات تشغيلية لازم تتقفل قبل العمل مع أعضاء حقيقيين.',
                      en: 'Operational gaps must be closed before working with real members.' },
  'rr.noaccessbody':{ ar: 'الموظف ده مش ضمن نطاقك.', en: 'This employee is outside your scope.' },

  /* ── staff · operations platform (admin) ────────────────────────────────── */
  'ad.platform':    { ar: 'منصة التشغيل',         en: 'Operations platform' },
  'ad.noaccess':    { ar: 'مش مصرّح',              en: 'Not authorised' },
  'ad.noaccessops': { ar: 'حسابك مش معاه صلاحية تشغيل المنصة.', en: 'Your account has no permission to run the platform.' },
  'ad.back':        { ar: 'ارجع',                 en: 'Back' },
  'ad.sections':    { ar: 'أقسام',                en: 'Sections' },
  'ad.tabops':      { ar: 'لوحة التشغيل',         en: 'Operations' },
  'ad.tabinbox':    { ar: 'الوارد',               en: 'Inbox' },
  'ad.taborg':      { ar: 'المنظمة',              en: 'Organisation' },
  'ad.tabusers':    { ar: 'المستخدمون',           en: 'Users' },
  'ad.tabaudit':    { ar: 'سجل التدقيق',          en: 'Audit log' },
  'ad.dirhealth':   { ar: 'صحة دفتر المستخدمين',  en: 'User directory health' },
  'ad.dirhealthsub':{ ar: 'الأرقام دي بتخدم قرار تشغيلي — سلامة الهوية وتغطية الإسناد، مش أداء التدريب.',
                      en: 'These numbers serve an operational decision — identity integrity and assignment coverage, not training performance.' },
  'ad.active':      { ar: 'نشط',                  en: 'Active' },
  'ad.disabled':    { ar: 'معطّل',                 en: 'Disabled' },
  'ad.archivedst':  { ar: 'مؤرشف',                en: 'Archived' },
  'ad.opissues':    { ar: 'مشاكل تشغيلية',        en: 'Operational issues' },
  'ad.byrole':      { ar: 'التوزيع حسب الدور',    en: 'By role' },
  'ad.employees':   { ar: 'موظفون',               en: 'Employees' },
  'ad.trainers':    { ar: 'مدربون',               en: 'Trainers' },
  'ad.managers':    { ar: 'مديرون',               en: 'Managers' },
  'ad.admins':      { ar: 'مسؤولون',              en: 'Administrators' },
  'ad.coverage':    { ar: 'تغطية الإسناد',        en: 'Assignment coverage' },
  'ad.covtrainer':  { ar: 'موظفون معهم مدرب',     en: 'Staff with a trainer' },
  'ad.covmanager':  { ar: 'مدربون معهم مدير',     en: 'Trainers with a manager' },
  'ad.bybranch':    { ar: 'التوزيع حسب الفرع',    en: 'By branch' },
  'ad.nobranches':  { ar: 'مفيش فروع محددة بعد',  en: 'No branches defined yet' },
  'ad.sevcritical': { ar: 'حرج',                  en: 'Critical' },
  'ad.sevwarning':  { ar: 'تحذير',                en: 'Warning' },
  'ad.sevinfo':     { ar: 'معلومة',               en: 'Info' },
  'ad.needsyou':    { ar: 'محتاج انتباهك النهارده', en: 'Needs your attention today' },
  'ad.issuecount':  { ar: 'مشكلة تشغيلية',        en: 'operational issues' },
  'ad.autodetect':  { ar: 'المنصة بتكتشف المشاكل تلقائيًا — إنت مش بتدوّر عليها.',
                      en: 'The platform finds issues on its own — you do not go looking for them.' },
  'ad.allclear':    { ar: 'كل حاجة سليمة',        en: 'All clear' },
  'ad.allclearbody':{ ar: 'مفيش مشاكل تشغيلية دلوقتي — دفتر المستخدمين والإسنادات كلها متسقة.',
                      en: 'No operational issues right now — the user directory and its assignments are consistent.' },
  'ad.audittitle':  { ar: 'سجل التدقيق',          en: 'Audit log' },
  'ad.auditsub':    { ar: 'كل فعل إداري اتسجّل — مين عمل إيه ومتى.',
                      en: 'Every administrative action is recorded — who did what, and when.' },
  'ad.searchlog':   { ar: 'ابحث في السجل…',       en: 'Search the log…' },
  'ad.searcharia':  { ar: 'بحث في التدقيق',       en: 'Search the audit log' },
  'ad.actiontype':  { ar: 'نوع الفعل',            en: 'Action type' },
  'ad.allactions':  { ar: 'كل الأفعال',           en: 'All actions' },
  'ad.export':      { ar: 'تصدير',                en: 'Export' },
  'ad.exportsoon':  { ar: 'التصدير هيتفعّل مع الخادم', en: 'Export becomes available with the server' },
  'ad.noevents':    { ar: 'مفيش أحداث',           en: 'No events' },
  'ad.noeventsbody':{ ar: 'لسه مفيش أفعال إدارية مطابقة للفلتر.', en: 'No administrative actions match the filter yet.' },

  /* ── staff · user directory ─────────────────────────────────────────────── */
  'us.title':       { ar: 'إدارة المستخدمين',     en: 'User management' },
  'us.noaccess':    { ar: 'حسابك مش معاه صلاحية عرض إدارة المستخدمين.', en: 'Your account has no permission to view user management.' },
  'us.adduser':     { ar: 'إضافة مستخدم',         en: 'Add user' },
  'us.newuser':     { ar: 'مستخدم جديد',          en: 'New user' },
  'us.added':       { ar: 'تمت إضافة المستخدم',   en: 'User added' },
  'us.name':        { ar: 'الاسم',                en: 'Name' },
  'us.newname':     { ar: 'الاسم الجديد',         en: 'New name' },
  'us.email':       { ar: 'الإيميل',              en: 'Email' },
  'us.emailopt':    { ar: 'الإيميل (اختياري)',    en: 'Email (optional)' },
  'us.newemail':    { ar: 'الإيميل الجديد',       en: 'New email' },
  'us.branch':      { ar: 'الفرع',                en: 'Branch' },
  'us.branchopt':   { ar: 'الفرع (اختياري)',      en: 'Branch (optional)' },
  'us.newbranch':   { ar: 'الفرع الجديد',         en: 'New branch' },
  'us.role':        { ar: 'الدور',                en: 'Role' },
  'us.create':      { ar: 'إنشاء',                en: 'Create' },
  'us.cancel':      { ar: 'إلغاء',                en: 'Cancel' },
  'us.save':        { ar: 'حفظ',                  en: 'Save' },
  'us.saved':       { ar: 'تم الحفظ',             en: 'Saved' },
  'us.edit':        { ar: 'تعديل',                en: 'Edit' },
  'us.disabled':    { ar: 'معطّل',                 en: 'Disabled' },
  'us.enable':      { ar: 'تفعيل',                en: 'Enable' },
  'us.disable':     { ar: 'تعطيل',                en: 'Disable' },
  'us.enabled_ok':  { ar: 'تم التفعيل',           en: 'Enabled' },
  'us.disabled_ok': { ar: 'تم التعطيل',           en: 'Disabled' },
  'us.notrainer':   { ar: 'بدون مدرب',            en: 'No trainer' },
  'us.nomanager':   { ar: 'بدون مدير',            en: 'No manager' },
  'us.trainerof':   { ar: 'مدرب:',                en: 'Trainer:' },
  'us.managerof':   { ar: 'مدير:',                en: 'Manager:' },
  'us.roleof':      { ar: 'دور',                  en: 'Role of' },
  'us.trainerfor':  { ar: 'مدرب',                 en: 'Trainer for' },
  'us.managerfor':  { ar: 'مدير',                 en: 'Manager for' },
  'us.rolechanged': { ar: 'تم تغيير الدور',       en: 'Role changed' },
  'us.trainerset':  { ar: 'تم إسناد المدرب',      en: 'Trainer assigned' },
  'us.managerset':  { ar: 'تم إسناد المدير',      en: 'Manager assigned' },
  'us.resetpw':     { ar: 'إعادة تعيين',          en: 'Reset password' },
  'us.resetnote':   { ar: 'بيسجّل طلب في سجل التدقيق لحد ما نظام الدخول يتفعّل',
                      en: 'Records a request in the audit log until sign-in management is live' },
  'us.resetdone':   { ar: 'تم تسجيل طلب إعادة التعيين', en: 'Reset request recorded' },
  'us.archive':     { ar: 'أرشفة',                en: 'Archive' },
  'us.archived':    { ar: 'مؤرشف',                en: 'Archived' },
  'us.archivedone': { ar: 'تمت الأرشفة — السجل محفوظ', en: 'Archived — the record is kept' },
  'us.archiveask':  { ar: 'أرشفة',                en: 'Archive' },
  'us.archivebody': { ar: 'المستخدم هيتشال من القوائم النشطة، لكن كل سجله التدريبي والإداري بيتحفظ للأبد — الأرشفة مش حذف.',
                      en: 'The user leaves the active lists, but their entire training and administrative record is kept forever — archiving is not deletion.' },
  'us.archiveList': { ar: 'الأرشيف',              en: 'Archive' },
  'us.archivenote': { ar: '— محفوظ بالكامل، لا يُحذف أبدًا', en: '— kept in full, never deleted' },

  /* ── staff · trainer desk ───────────────────────────────────────────────── */
  'tn.title':       { ar: 'لوحة المدرب',          en: 'Trainer desk' },
  'tn.noaccess':    { ar: 'حسابك مش معاه صلاحية مراجعة التدريب.', en: 'Your account has no permission to review training.' },
  'tn.needyou':     { ar: 'محتاجين انتباهك النهارده', en: 'Waiting for you today' },
  'tn.needyousub':  { ar: 'وحدات عدّت امتحانها ومستنية تقييمك العملي قبل ما اللي بعدها يتفتح.',
                      en: 'Units that passed their exam and are waiting for your practical assessment before the next one opens.' },
  'tn.nothing':     { ar: 'مفيش حاجة مستنياك',    en: 'Nothing waiting for you' },
  'tn.nothingbody': { ar: 'أول ما متدرب يعدّي امتحان وحدة، هتلاقيها هنا في انتظار تقييمك العملي.',
                      en: 'As soon as a trainee passes a unit exam, it appears here for your practical assessment.' },
  'tn.passedwait':  { ar: 'عدّى الامتحان ومستني تقييمك العملي', en: 'passed the exam, awaiting your practical assessment' },
  'tn.assessnow':   { ar: 'قيّم دلوقتي',           en: 'Assess now' },
  'tn.reassess':    { ar: 'إعادة تقييم',          en: 'Reassess' },
  'tn.improving':   { ar: 'قيد التحسين',          en: 'Improving' },
  'tn.reviewing':   { ar: 'بيراجع الدروس المحددة', en: 'Reviewing the flagged lessons' },
  'tn.yourstaff':   { ar: 'موظفينك',              en: 'Your staff' },
  'tn.deviceonly':  { ar: 'الأرقام هنا للمتدرب اللي بيستخدم الجهاز ده:', en: 'These numbers belong to the trainee using this device:' },
  'tn.deviceonly2': { ar: 'باقي الموظفين تقدّمهم محفوظ على أجهزتهم — التقييم العملي هو اللي بيوصلك منهم دلوقتي.',
                      en: 'Everyone else keeps their progress on their own device — the practical assessment is what reaches you from them today.' },
  'tn.nostaff':     { ar: 'مفيش موظفين مسندين ليك بعد — بيتضافوا من إدارة المستخدمين.',
                      en: 'No staff assigned to you yet — they are added from user management.' },
  'tn.notesaved':   { ar: 'تم حفظ الملاحظة في السجل', en: 'Note saved to the record' },
  'tn.today':       { ar: 'اليوم',                en: 'Today' },
  'tn.yesterday':   { ar: 'من إمبارح',            en: 'Yesterday' },
  'tn.daysago':     { ar: 'من',                   en: '' },
  'tn.days':        { ar: 'أيام',                 en: 'days ago' },
  'tn.syncing':     { ar: 'التقدّم مع المزامنة',   en: 'Progress syncs later' },
  'tn.note':        { ar: 'ملاحظة',               en: 'Note' },
  'tn.noteph':      { ar: 'ملاحظة تدريبية…',      en: 'Coaching note…' },
  'tn.save':        { ar: 'حفظ',                  en: 'Save' },
  'tn.task':        { ar: 'المهمة:',              en: 'Task:' },
  'tn.discussion':  { ar: 'سؤال النقاش:',         en: 'Discussion question:' },
  'tn.mistakes':    { ar: 'أخطاء شائعة',          en: 'Common mistakes' },
  'tn.practical':   { ar: 'تقييم عملي ·',         en: 'Practical assessment ·' },
  'tn.overall':     { ar: 'الجاهزية الكلية',      en: 'Overall readiness' },
  'tn.observed':    { ar: 'لاحظته وإنت شغّال (اختياري)', en: 'What you observed while working (optional)' },
  'tn.rulesmissed': { ar: 'قواعد بيغلط فيها (اختياري)', en: 'Rules they get wrong (optional)' },
  'tn.autosuggest': { ar: 'المنصة بترشّح تلقائيًا', en: 'The platform suggests automatically' },
  'tn.willopen':    { ar: '— هيتفتحوا للمتدرب لو قرارك «يحتاج تحسين».', en: '— these open for the trainee if your decision is «needs improvement».' },
  'tn.guideph':     { ar: 'ملاحظات التوجيه (بتتسجل في السجل)…', en: 'Coaching notes (recorded in the log)…' },
  'tn.extenddays':  { ar: 'مدة التمديد عند الرفض:', en: 'Extension length on rejection:' },
  'tn.extendaria':  { ar: 'أيام التمديد',         en: 'Extension days' },
  'tn.day':         { ar: 'يوم',                  en: 'days' },
  'tn.conduct':     { ar: 'التمثيل المهني — شفتها ولا لأ', en: 'Professional conduct — did you see it' },
  'tn.conductnote': { ar: 'القرار الصح بتوصيل غلط مش نجاح — «جاهز» مقفولة لحد ما الأربعة يتشافوا.',
                      en: 'A right decision delivered badly is not a pass — «Ready» stays locked until all four are seen.' },
  'tn.conductmiss': { ar: 'التمثيل المهني لسه ناقص', en: 'Professional conduct is still incomplete' },
  'tn.cancel':      { ar: 'إلغاء',                en: 'Cancel' },
  'tn.escalate':    { ar: 'تصعيد للمدير',         en: 'Escalate to the manager' },
  'tn.notready':    { ar: 'غير جاهز',             en: 'Not ready' },
  'tn.extend':      { ar: 'تمديد — أيام إضافية',  en: 'Extend — additional days' },
  'tn.ready':       { ar: 'جاهز — افتح الوحدة الجاية', en: 'Ready — open the next unit' },
  'tn.needsimp':    { ar: 'يحتاج تحسين في نقاط محددة', en: 'Needs improvement on specific points' },
  'tn.recorded':    { ar: 'تم التسجيل — الدروس المحددة اتفتحت للمتدرب للمراجعة',
                      en: 'Recorded — the flagged lessons are open for the trainee to review' },
  'tn.approvedmsg': { ar: 'تم الاعتماد — الوحدة الجاية اتفتحت للمتدرب', en: 'Approved — the next unit is open for the trainee' },

  /* ── staff · manager desk ───────────────────────────────────────────────── */
  'mg.title':       { ar: 'لوحة الإدارة',         en: 'Manager desk' },
  'mg.noaccess':    { ar: 'حسابك مش معاه صلاحية عرض التقارير الإدارية.', en: 'Your account has no permission to view management reports.' },
  'mg.orgtoday':    { ar: 'المؤسسة اليوم',        en: 'The organisation today' },
  'mg.areatoday':   { ar: 'منطقتك اليوم',         en: 'Your area today' },
  'mg.branchtoday': { ar: 'فرعك اليوم',           en: 'Your branch today' },
  'mg.sub':         { ar: 'مين محتاج تدخّلك دلوقتي — وحالة الفرع في نظرة.',
                      en: 'Who needs you right now — and the state of the branch at a glance.' },
  'mg.nodata':      { ar: 'لسه مفيش بيانات تدريب', en: 'No training data yet' },
  'mg.nodatabody':  { ar: 'أول ما المدربون يبدأوا يقيّموا الموظفين، هتلاقي هنا حالة الجاهزية وصحة الفرع.',
                      en: 'Once trainers start assessing staff, readiness and branch health appear here.' },
  'mg.decisions':   { ar: 'قرارات بانتظارك',      en: 'Decisions waiting for you' },
  'mg.decisionsub': { ar: 'موظفون أنهوا البرنامج ومستنيين قرارك', en: 'Staff who finished the programme and await your decision' },
  'mg.branches':    { ar: 'الفروع',               en: 'Branches' },
  'mg.yourbranches':{ ar: 'فروعك',                en: 'Your branches' },
  'mg.allbranches': { ar: 'كل الفروع',            en: 'All branches' },
  'mg.orghealth':   { ar: 'صحة المؤسسة',          en: 'Organisation health' },
  'mg.areahealth':  { ar: 'صحة منطقتك',           en: 'Area health' },
  'mg.branchhealth':{ ar: 'صحة الفرع',            en: 'Branch health' },
  'mg.readiness':   { ar: 'الجاهزية',             en: 'Readiness' },
  'mg.avgbranch':   { ar: 'متوسط الفرع',          en: 'Branch average' },
  'mg.readystaff':  { ar: 'الجاهزون',             en: 'Ready' },
  'mg.finishedok':  { ar: 'أنهوا وجاهزون',        en: 'Finished and ready' },
  'mg.staff':       { ar: 'الموظفون',             en: 'Staff' },
  'mg.inbranch':    { ar: 'في الفرع',             en: 'in the branch' },
  'mg.needsfollow': { ar: 'يحتاج متابعة',         en: 'Needs follow-up' },
  'mg.needyou':     { ar: 'محتاجين تدخّلك',        en: 'need you' },
  'mg.awaitreview': { ar: 'بانتظار المراجعة',     en: 'Awaiting review' },
  'mg.attrainer':   { ar: 'عند المدرب',           en: 'with the trainer' },
  'mg.needint':     { ar: 'محتاج تدخّل',           en: 'need intervention' },
  'mg.forinfo':     { ar: 'للعلم',                en: 'for information' },
  'mg.needyours':   { ar: 'محتاج تدخّلك',          en: 'Needs your intervention' },
  'mg.tofollow':    { ar: 'للمتابعة',             en: 'To follow up' },
  'mg.allgood':     { ar: 'مفيش حاجة محتاجة تدخّلك دلوقتي — كل الموظفين تحت متابعة سليمة.',
                      en: 'Nothing needs you right now — every member of staff is properly followed up.' },
  'mg.nostaff':     { ar: 'مفيش موظفين مسجّلين بعد.', en: 'No staff registered yet.' },
  'mg.readinessof': { ar: 'جاهزية',               en: 'Readiness' },
  'mg.trainerof':   { ar: 'المدرب:',              en: 'Trainer:' },
  'mg.notstarted':  { ar: 'ما بدأ بعد',           en: 'Not started' },
  'mg.unassigned':  { ar: 'غير معيّن',             en: 'Unassigned' },
  'mg.undefined':   { ar: 'غير محدد',             en: 'Undefined' },
  'mg.programdone': { ar: 'أكمل البرنامج',        en: 'Programme complete' },
  'mg.today':       { ar: 'النهارده',             en: 'Today' },
  'mg.yesterday':   { ar: 'إمبارح',               en: 'Yesterday' },
  'mg.dayssince':   { ar: 'من',                   en: '' },
  'mg.dayunit':     { ar: 'يوم',                  en: 'days ago' },
  /* statuses */
  'mg.stready':     { ar: 'جاهز للمكتب',          en: 'Ready for the office' },
  'mg.stontrack':   { ar: 'على المسار',           en: 'On track' },
  'mg.stattention': { ar: 'محتاج انتباه',         en: 'Needs attention' },
  'mg.stimmediate': { ar: 'انتباه فوري',          en: 'Immediate attention' },
  /* employee dialog */
  'mg.filetitle':   { ar: 'ملف الموظف —',         en: 'Staff file —' },
  'mg.report':      { ar: 'التقرير',              en: 'Report' },
  'mg.close':       { ar: 'إغلاق',                en: 'Close' },
  'mg.orphan':      { ar: 'بدون مدرب — عالق',     en: 'No trainer — stuck' },
  'mg.noassess':    { ar: 'لسه مفيش تقييمات مسجّلة — الحكم هيظهر أول ما المدرب يقيّم أول وحدة.',
                      en: 'No assessments recorded yet — the verdict appears once a trainer assesses the first unit.' },
  'mg.trend':       { ar: 'الاتجاه',              en: 'Trend' },
  'mg.improving':   { ar: 'يتحسّن',                en: 'Improving' },
  'mg.declining':   { ar: 'يتراجع',               en: 'Declining' },
  'mg.stable':      { ar: 'مستقر',                en: 'Stable' },
  'mg.needsimp':    { ar: 'يحتاج إلى تحسين',      en: 'Needs improvement' },
  'mg.responsible': { ar: 'المدرب المسؤول',       en: 'Responsible trainer' },
  'mg.timeline':    { ar: 'الخط الزمني للتدريب',  en: 'Training timeline' },
  'mg.submitted':   { ar: 'قدّم',                  en: 'Submitted' },
  'mg.forreview':   { ar: 'للمراجعة',             en: 'for review' },
  'mg.evaluation':  { ar: 'تقييم',                en: 'Assessment' },
  'mg.extended':    { ar: 'تمديد تدريب —',        en: 'Training extended —' },
  'mg.reopened':    { ar: 'إعادة فتح درس',        en: 'Lesson reopened' },
  'mg.coachnote':   { ar: 'ملاحظة توجيه',         en: 'Coaching note' },
  /* readiness decision */
  'mg.decision':    { ar: 'قرار الجاهزية',        en: 'Readiness decision' },
  'mg.locked':      { ar: 'القرار بيتفتح لما المدرب يعتمد كل الوحدات — دلوقتي',
                      en: 'The decision opens once the trainer approves every unit — currently' },
  'mg.unlocked':    { ar: 'كل الوحدات معتمدة. القرار النهائي من صلاحية المدير.',
                      en: 'All units approved. The final decision is the manager\'s to make.' },
  'mg.rationaleph': { ar: 'المبرر — على أي دليل مبني القرار؟', en: 'Rationale — what evidence is this decision built on?' },
  'mg.rationale':   { ar: 'مبرر قرار الجاهزية',   en: 'Readiness decision rationale' },
  'mg.decready':    { ar: 'جاهز للعمل',           en: 'Ready for work' },
  'mg.decextend':   { ar: 'تمديد',                en: 'Extend' },
  'mg.decreject':   { ar: 'غير جاهز',             en: 'Not ready' },
  'mg.vready':      { ar: 'جاهز للعمل',           en: 'Ready for work' },
  'mg.vcond':       { ar: 'جاهز بشروط',           en: 'Ready with conditions' },
  'mg.vextend':     { ar: 'يحتاج تمديد',          en: 'Needs an extension' },
  'mg.vnot':        { ar: 'مش جاهز',              en: 'Not ready' },
  'mg.risklow':     { ar: 'مخاطرة منخفضة',        en: 'Low risk' },
  'mg.riskmed':     { ar: 'مخاطرة متوسطة',        en: 'Medium risk' },
  'mg.riskhigh':    { ar: 'مخاطرة عالية',         en: 'High risk' },
  'mg.extendlong':  { ar: 'تمديد التدريب',        en: 'Extend the training' },

  /* ── accessibility · names for landmarks and skip targets ──────────────── */
  'a11y.screenbar': { ar: 'تنقّل الشاشة',          en: 'Screen navigation' },
  'a11y.skip':      { ar: 'تخطَّ إلى المحتوى',      en: 'Skip to main content' },
  'a11y.doctitle':  { ar: 'أكاديمية عمليات العضويات — وادي دجلة', en: 'Membership Operations Academy — Wadi Degla' },
  'a11y.mainnav':   { ar: 'التنقّل الرئيسي',       en: 'Main navigation' },
  'a11y.tabnav':    { ar: 'تبويبات المنصة',       en: 'Primary tabs' },

} as const;

export type Key = keyof typeof DICT;

const read = (): Lang => {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ar'; } catch { return 'ar'; }
};

let lang: Lang = read();
const listeners = new Set<() => void>();

/**
 * 🔴 DIRECTION IS A PROPERTY OF LANGUAGE, AND IT LIVES ON <html>.
 *
 * The document was pinned to `dir="rtl"` in twenty places and `lang="ar"` in
 * the HTML file, in BOTH modes. English mode therefore ran inside a right-to-
 * left document: tabs read right-to-left for a left-to-right reader, trailing
 * punctuation jumped to the head of the line («.Membership team»), and — the
 * part no screenshot shows — a screen reader announced every English label with
 * Arabic phonetics, because `lang` never changed. WCAG 3.1.1/3.1.2 are not
 * satisfied by translating strings; they are satisfied by declaring which
 * language each part IS.
 *
 * One function, called from one place, owns both attributes. Nothing else in
 * the product sets `dir` on the document — screens that legitimately need a
 * different direction (Arabic lesson content inside English chrome) declare it
 * on their own block, with `lang` beside it, through <ArabicContent>.
 */
export const dirOf = (l: Lang): 'rtl' | 'ltr' => (l === 'ar' ? 'rtl' : 'ltr');

const applyDocumentLanguage = (l: Lang) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = l;
  document.documentElement.dir = dirOf(l);
  /* 🔴 The <title> is the first thing a screen reader announces on load, and it
     stayed Arabic in English mode — a page announcing itself in a language the
     document has just declared it is not. It follows the language too. */
  document.title = DICT['a11y.doctitle'][l] ?? DICT['a11y.doctitle'].ar;
};
applyDocumentLanguage(lang);

export const langStore = {
  get: () => lang,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  set: (next: Lang) => {
    lang = next;
    try { localStorage.setItem(KEY, next); } catch { /* preference is best-effort */ }
    applyDocumentLanguage(next);
    listeners.forEach(l => l());
  },
  toggle: () => langStore.set(lang === 'ar' ? 'en' : 'ar'),
};

export const useLang = (): Lang => useSyncExternalStore(langStore.subscribe, langStore.get);

/** Translate a UI key. Falls back to Arabic — never to a raw key on screen. */
export const t = (key: Key, l: Lang = lang): string => DICT[key][l] ?? DICT[key].ar;
