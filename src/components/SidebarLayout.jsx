import { useState, useCallback, useRef, useEffect } from 'react';
import { TAB_GROUPS, SECTIONS, DEFAULT_EXPANDED, getGroupForIndex } from '../data/sections.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { THEMES } from '../data/themes.js';

// Chevron icon — simple SVG triangle that rotates when expanded.
function Chevron({ open, color }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      style={{ color }}
    >
      <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Sidebar hide/show toggle button.
function SidebarToggle({ visible, onClick, accentColor, textColor }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-0 top-1/2 z-30 flex items-center justify-center w-5 h-14 rounded-r-md transition-all duration-300 hover:w-6"
      style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: 'none',
        color: visible ? textColor : accentColor,
        transform: 'translateY(-50%)',
        ...(visible ? { left: '0', opacity: 0.3 } : { left: '0', opacity: 0.8 }),
      }}
      title={visible ? 'Hide sidebar' : 'Show sidebar'}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = visible ? '0.3' : '0.8'}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
        {visible ? (
          <path d="M7 1L2 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M3 1L8 7L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

// Collapsible group in the sidebar.
function TabGroup({
  group, flatOffset, activeIndex, onItemClick,
  expanded, onToggleExpand, accentColor, textColor, markerColor,
}) {
  const isGroupActive = group.children.some((_, i) => flatOffset + i === activeIndex);

  return (
    <div className="mb-2">
      {/* Group header */}
      <button
        onClick={onToggleExpand}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-150 rounded-md group ${
          isGroupActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
        }`}
      >
        <Chevron open={expanded} color={isGroupActive ? accentColor : textColor} />
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-mono shrink-0"
          style={{
            background: isGroupActive ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
            color: isGroupActive ? accentColor : textColor,
          }}
        >
          {group.icon}
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: isGroupActive ? accentColor : `${textColor}cc` }}
        >
          {group.label}
        </span>
      </button>

      {/* Sub-items */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? `${group.children.length * 40}px` : '0px' }}
      >
        <ul className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/[0.06] pl-3">
          {group.children.map((child, i) => {
            const flatIdx = flatOffset + i;
            const isActive = flatIdx === activeIndex;
            return (
              <li key={child.label}>
                <button
                  onClick={() => onItemClick(flatIdx)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-[0.82rem] transition-all duration-150 ${
                    isActive
                      ? 'font-medium'
                      : 'hover:bg-white/[0.04]'
                  }`}
                  style={{
                    color: isActive ? accentColor : `${textColor}aa`,
                    background: isActive ? `${accentColor}10` : undefined,
                  }}
                >
                  {child.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function SidebarLayout({ activeIndex, onItemClick, children }) {
  const { global } = usePlayer();
  const theme = THEMES.find(t => t.id === global.theme) ?? THEMES[0];
  const { accent, text, marker } = theme.sidebar;

  // Sidebar visibility state (persisted in sessionStorage so it survives page reloads but not sessions).
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    try { return sessionStorage.getItem('adv:sidebar') !== 'hidden'; } catch { return true; }
  });

  // Track which groups are expanded.
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = sessionStorage.getItem('adv:sidebar-expanded');
      return saved ? JSON.parse(saved) : { ...DEFAULT_EXPANDED };
    } catch { return { ...DEFAULT_EXPANDED }; }
  });

  // Auto-expand the group containing the active section.
  useEffect(() => {
    const group = getGroupForIndex(activeIndex);
    if (group && !expanded[group.id]) {
      setExpanded(prev => ({ ...prev, [group.id]: true }));
    }
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist expanded state.
  useEffect(() => {
    try { sessionStorage.setItem('adv:sidebar-expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(v => {
      const next = !v;
      try { sessionStorage.setItem('adv:sidebar', next ? 'visible' : 'hidden'); } catch {}
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId) => {
    setExpanded(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  // Compute flat offsets for each group.
  let flatOffset = 0;

  return (
    <>
      {/* Sidebar toggle — always visible */}
      <div className="hidden lg:block">
        <SidebarToggle visible={sidebarVisible} onClick={toggleSidebar} accentColor={accent} textColor={text} />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:flex-row lg:py-16">
        {/* Sidebar */}
        {sidebarVisible && (
          <aside className="hidden lg:block lg:sticky lg:top-28 lg:h-[calc(100vh-9rem)] lg:shrink-0 lg:w-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <nav className="py-2">
              {TAB_GROUPS.map(group => {
                const offset = flatOffset;
                flatOffset += group.children.length;
                return (
                  <TabGroup
                    key={group.id}
                    group={group}
                    flatOffset={offset}
                    activeIndex={activeIndex}
                    onItemClick={onItemClick}
                    expanded={!!expanded[group.id]}
                    onToggleExpand={() => toggleGroup(group.id)}
                    accentColor={accent}
                    textColor={text}
                    markerColor={marker}
                  />
                );
              })}
            </nav>
          </aside>
        )}

        {/* Content */}
        <main className={`min-w-0 flex-1 ${!sidebarVisible ? 'lg:pl-4' : ''}`}>{children}</main>
      </div>
    </>
  );
}
