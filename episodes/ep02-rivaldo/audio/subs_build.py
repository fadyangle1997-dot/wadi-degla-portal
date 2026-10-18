import json,sys
ep='/home/user/wadi-degla-portal/episodes/ep02-rivaldo/'
D=json.load(open(ep+'audio/line_timings_edit.json',encoding='utf-8')); L=D['lines']
nomerge=set(range(88,112))|{0,3,25,58,65,66,67,106,107,108,129,130}
W=34
def is_lead(i):
    t=L[i]['text'].strip(); return t.endswith(('،',':')) and len(t.split())<=3
cues=[]; i=0
while i<len(L):
    if i+1<len(L) and is_lead(i) and i not in nomerge:
        cues.append([L[i],L[i+1]]); i+=2; continue
    a=L[i]; t=a['text'].strip()
    ok = (i+1<len(L) and i not in nomerge and t.endswith(('،',':','…')) and len(t)<=W and len(L[i+1]['text'])<=W
          and L[i+1]['start']-a['end']<0.9 and not (i+2<len(L) and is_lead(i+1)))
    if ok: cues.append([a,L[i+1]]); i+=2
    else: cues.append([a]); i+=1
cl=lambda s: s.replace('ـ','')
HAND={
 'استبعد أفضل لاعب في العالم من الفريق.':['استبعد أفضل لاعب في العالم','من الفريق.'],
 'وكمان يفوز بجائزة الفيفا لأفضل لاعب في العالم لسنة 1999.':['وكمان يفوز بجائزة الفيفا','لأفضل لاعب في العالم لسنة 1999.'],
 'في نفس اليوم اللي اتعلن فيه أفضل لاعب في أوروبا…':['في نفس اليوم اللي اتعلن فيه','أفضل لاعب في أوروبا…'],
 'بس كان فيه شخص واحد مؤمن إن ابنه ممكن يبقى لاعب كبير…':['بس كان فيه شخص واحد مؤمن','إن ابنه ممكن يبقى لاعب كبير…'],
 'ريفالدو وصل إسبانيا من بوابة ديبورتيفو لاكورونيا.':['ريفالدو وصل إسبانيا','من بوابة ديبورتيفو لاكورونيا.'],
 'وريفالدو أعلن إنه مش عايز يكمل في مركز الجناح.':['وريفالدو أعلن إنه مش عايز','يكمل في مركز الجناح.'],
 'وريفالدو قرر يعمل واحدة من أعظم مبارياته بقميص برشلونة.':['وريفالدو قرر يعمل واحدة','من أعظم مبارياته بقميص برشلونة.'],
 'ريفالدو واقف مع منتخب البرازيل في نهائي كأس العالم.':['ريفالدو واقف مع منتخب البرازيل','في نهائي كأس العالم.'],
 'وسجل هدفًا مستحيلًا أنقذ به برشلونة في واحدة من أهم لياليه…':['وسجل هدفًا مستحيلًا أنقذ به','برشلونة في واحدة من أهم لياليه…'],
 'هنتكلم عن برازيلي تاني وصل برشلونة بعد ما ريفالدو مشي بسنة.':['هنتكلم عن برازيلي تاني وصل برشلونة','بعد ما ريفالدو مشي بسنة.'],
}
def split2(t):
    if t in HAND: return HAND[t]
    w=t.split(' '); c=min(range(1,len(w)),key=lambda c:max(len(' '.join(w[:c])),len(' '.join(w[c:])))); return [' '.join(w[:c]),' '.join(w[c:])]
def fmt(t):
    ms=int(round(t*1000)); h,ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000); return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
out=[]
for k,g in enumerate(cues):
    st=g[0]['start']; en=g[-1]['end']+0.4
    if k+1<len(cues): en=min(en,cues[k+1][0]['start']-2/30)
    ls=[cl(x['text']) for x in g] if len(g)==2 else (split2(cl(g[0]['text'])) if len(g[0]['text'])>W else [cl(g[0]['text'])])
    out.append((st,en,ls))
with open(ep+'audio/rivaldo_ep2.ar.srt','w',encoding='utf-8') as f:
    for k,(st,en,ls) in enumerate(out,1): f.write(f"{k}\n{fmt(st)} --> {fmt(en)}\n"+'\n'.join('‫'+x+'‬' for x in ls)+"\n\n")
json.dump([{'start':round(a,3),'end':round(b,3),'lines':c} for a,b,c in out],open(ep+'audio/subs_edit.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('cues',len(out),'max line',max(len(x) for _,_,c in out for x in c))
for st,en,ls in out: print(f"{st:7.2f}-{en:7.2f} | "+' / '.join(ls))
