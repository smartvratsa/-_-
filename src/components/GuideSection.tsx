import React from 'react';
import {
  ShieldAlert,
  Users,
  Wrench,
  AlertTriangle,
  EyeOff,
  PhoneCall,
  CheckCircle,
  HelpCircle,
  Building2,
  FileCheck2
} from 'lucide-react';

export const GuideSection: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-3 shadow-xl">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Методология на „Градски помощник Враца“</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Как определяме пътя към решението и гарантираме безопасността
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          AI асистентът не взема крайни решения – той предлага категоризация и оптимален път,
          който винаги се валидира от човек (гражданин или служител на Община Враца).
          При всяко колебание между два пътя, системата избира по-внимателния и безопасен вариант.
        </p>
      </div>

      {/* The 3 Paths Detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Blue Path */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Път Син (Blue)
              </span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Гражданска инициатива</span>
            </h3>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Само прости, напълно безопасни дейности, които доброволци могат да извършат
              без специални умения и без намеса в чужда собственост.
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 block">Типични примери:</span>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Почистване на битови отпадъци от алеи и поляни</li>
                <li>Засаждане на цветя и храсти в одобрени зони</li>
                <li>Освежаване и боядисване на предварителен терен</li>
                <li>Информационни кампании и квартални акции</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>Не изисква предварително общинско одобрение</span>
          </div>
        </div>

        {/* Yellow Path */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Път Жълт (Yellow)
              </span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <span>Община + граждани</span>
            </h3>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Дейности, при които активни доброволци могат да помогнат с труд и време,
              но е нужно съгласуване, разрешение или предоставяне на материали от Общината.
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 block">Типични примери:</span>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Подмяна на летви и боядисване на пейки (дървото се дава от БКС)</li>
                <li>Ремонт на дървена ограда на детска площадка</li>
                <li>Почистване на нецензурни графити от общински фасади</li>
                <li>Озеленяване с осигурен общински разсад</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-amber-300 font-semibold flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4" />
            <span>Изисква одобрение и материали от Община Враца</span>
          </div>
        </div>

        {/* Red Path */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Път Червен (Red)
              </span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Само компетентна служба</span>
            </h3>
            <p className="text-xs text-rose-200/80 leading-relaxed">
              Всичко опасно, специализирано или регулирано. Намесата на граждани е
              строго ЗАБРАНЕНА с цел опазване на живота и здравето!
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 block">Типични примери:</span>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Електрически кабели, табла, осветителни стълбове</li>
                <li>Дълбоки дупки и компрометирана пътна настилка</li>
                <li>Пътни знаци, светофари, маркировка на кръстовище</li>
                <li>ВиК аварии, шахти без капаци, газификация</li>
                <li>Паднали и надвиснали клони/дървета, работа на височина</li>
                <li>Сгради с риск от срутване, агресивни или болни животни</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-rose-300 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>0% ремонт от граждани; стъпки само за безопасност</span>
          </div>
        </div>
      </div>

      {/* Mandatory Safety and Privacy Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safety & 112 Rule */}
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
            <PhoneCall className="w-5 h-5 text-red-400" />
            <span>Правило за спешност и тел. 112</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ако има непосредствена опасност за човешкия живот (оголен проводник под напрежение,
            срутване, пожар, пострадал гражданин), AI асистентът автоматично поставя приоритет
            <strong className="text-rose-400"> „Спешен“</strong>, извежда предупреждение за опасност
            и инструктира гражданина незабавно да позвъни на <strong className="text-white">тел. 112</strong>!
          </p>
          <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-xl text-xs text-red-200">
            Никога не се предоставят инструкции как гражданин да поправя проблем от червения път.
          </div>
        </div>

        {/* Privacy & GDPR Rule */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-wider">
            <EyeOff className="w-5 h-5 text-cyan-400" />
            <span>Защита на личните данни (GDPR)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ако на снимката се виждат лица на преминаващи хора, регистрационни номера на автомобили
            или други лични данни, AI системата автоматично ги засича и маркира за защита.
            Платформата замъглява тези зони преди публикуване, а асистентът гарантира поверителността на гражданите.
          </p>
          <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl text-xs text-cyan-200">
            Пълна защита на самоличността на жителите и гостите на град Враца.
          </div>
        </div>
      </div>
    </div>
  );
};
