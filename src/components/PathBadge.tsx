import React from 'react';
import { ResolutionPath, IssuePriority, ConfidenceLevel } from '../types';
import { ShieldAlert, Users, Wrench, AlertTriangle } from 'lucide-react';

interface PathBadgeProps {
  path: ResolutionPath;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PathBadge: React.FC<PathBadgeProps> = ({ path, size = 'md', showIcon = true }) => {
  const configs = {
    blue: {
      label: 'Гражданска инициатива',
      icon: Users,
      bgColor: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
      dotColor: 'bg-blue-400',
      tag: '🔵 Път Син'
    },
    yellow: {
      label: 'Община + граждани',
      icon: Wrench,
      bgColor: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      dotColor: 'bg-amber-400',
      tag: '🟡 Път Жълт'
    },
    red: {
      label: 'Само компетентна служба',
      icon: ShieldAlert,
      bgColor: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      dotColor: 'bg-rose-400',
      tag: '🔴 Път Червен'
    }
  };

  const current = configs[path] || configs.blue;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${current.bgColor} ${sizeClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dotColor} shrink-0 animate-pulse`} />
      {showIcon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{current.label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: IssuePriority }> = ({ priority }) => {
  const configs = {
    нисък: {
      label: 'Нисък приоритет',
      style: 'bg-slate-700/60 border-slate-600 text-slate-300'
    },
    нормален: {
      label: 'Нормален приоритет',
      style: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
    },
    висок: {
      label: 'Висок приоритет',
      style: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
    },
    спешен: {
      label: 'СПЕШЕН (Риск / 112)',
      style: 'bg-rose-600/30 border-rose-500 text-rose-200 animate-pulse'
    }
  };

  const current = configs[priority] || configs.нормален;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-semibold ${current.style}`}>
      {priority === 'спешен' && <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />}
      {current.label}
    </span>
  );
};

export const ConfidenceBadge: React.FC<{ confidence: ConfidenceLevel }> = ({ confidence }) => {
  const colors = {
    висока: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    средна: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    ниска: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  };

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${colors[confidence] || colors.висока}`}>
      Увереност: {confidence}
    </span>
  );
};
