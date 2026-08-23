import { useMemo, useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { pad2 } from '../lib/format.js';
import { getMissionControlData } from '../lib/services/MissionControlService.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

function BlockBar({ pct, width = 20 }) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return (
    <span className="font-mono text-white/70">
      {'█'.repeat(filled)}{'░'.repeat(empty)}
    </span>
  );
}

function timeAgo(ts) {
  if (!ts) return 'NEVER';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'JUST NOW';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
  return `${Math.floor(diff / 86400000)}D AGO`;
}

export default function MissionControl() {
  const { show, global, watchedMap, stats, unlocked, aiConfig, favorites, collections, savedAdventures, adventureHistory, continueList, watchHistory, activeProfile, activeProfileId } = usePlayer();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => getMissionControlData({
    show, global, watchedMap, stats, unlocked, aiConfig,
    favorites, collections, savedAdventures, adventureHistory,
    continueList, watchHistory, activeProfile, activeProfileId,
  }), [show, global, watchedMap, stats, unlocked, aiConfig, favorites, collections, savedAdventures, adventureHistory, continueList, watchHistory, activeProfile, activeProfileId, tick]);

  const totalAchievements = ACHIEVEMENTS?.length || 0;
  const now = new Date();
  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Mission Control</h2>
          <p className="mt-1 text-white/60">Live system console.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${data.systemStatus === 'ONLINE' ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs font-mono text-white/60">{data.systemStatus}</span>
        </div>
      </div>

      {/* Clock */}
      <div className="font-mono text-xs text-white/30 text-right">SYS.TIME {clock}</div>

      {/* Stat blocks grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">LIBRARY</div>
          <div className="mt-1 font-mono text-lg text-white">{data.libraryItems}</div>
          <div className="text-xs font-mono text-white/30">ITEMS</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">WATCH TIME</div>
          <div className="mt-1 font-mono text-lg text-white">{data.todayWatchTime}</div>
          <div className="text-xs font-mono text-white/30">TODAY</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">STREAK</div>
          <div className="mt-1 font-mono text-lg text-white">{data.streak}</div>
          <div className="text-xs font-mono text-white/30">DAYS</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">EPISODES</div>
          <div className="mt-1 font-mono text-lg text-white">{data.episodesWatched}</div>
          <div className="text-xs font-mono text-white/30">WATCHED</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">SHOWS</div>
          <div className="mt-1 font-mono text-lg text-white">{data.showsCompleted}</div>
          <div className="text-xs font-mono text-white/30">COMPLETED</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">ACHIEVEMENTS</div>
          <div className="mt-1 font-mono text-lg text-white">{data.achievementsUnlocked}/{totalAchievements}</div>
          <div className="text-xs font-mono text-white/30">UNLOCKED</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">TODAY</div>
          <div className="mt-1 font-mono text-lg text-white">{data.todayWatchTime}</div>
          <div className="text-xs font-mono text-white/30">WATCH TIME</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">PROFILE</div>
          <div className="mt-1 font-mono text-lg text-white truncate">{data.profileName}</div>
          <div className="text-xs font-mono text-white/30">ACTIVE</div>
        </div>
      </div>

      {/* Current Mission */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">CURRENT MISSION</div>
        <div className="space-y-2 font-mono">
          <div className="text-xs text-white/40">TARGET</div>
          <div className="text-sm text-white">{data.currentMission}</div>
          <div className="flex items-center gap-3">
            <BlockBar pct={data.missionPct} width={24} />
            <span className="text-xs text-white/60">{data.missionPct}%</span>
          </div>
          {data.missionNext && (
            <div className="text-xs text-white/30">
              NEXT → S{pad2(data.missionNext.season)}E{pad2(data.missionNext.episode)}
            </div>
          )}
        </div>
      </div>

      {/* Current Adventure */}
      {data.currentAdventure && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">CURRENT ADVENTURE</div>
          <div className="space-y-2 font-mono">
            <div className="text-xs text-white/40">MISSION #{data.currentAdventure.number}</div>
            <div className="text-sm text-white">{data.currentAdventure.showName}</div>
            <div className="text-xs text-white/60">PROGRESS {data.currentAdventure.progress}</div>
          </div>
        </div>
      )}

      {/* AI Status */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white">AI STATUS</div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${data.aiStatus === 'ONLINE' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs font-mono text-white/40">{data.aiStatus}</span>
          </div>
        </div>
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white/60">PROVIDER <span className="text-white">{data.aiProvider}</span></div>
          <div className="text-white/60">MODEL <span className="text-white">{data.aiModel}</span></div>
          <div className="text-white/60">REQUESTS <span className="text-white">{data.aiRequests}</span></div>
          <div className="text-white/60">ERRORS <span className="text-white">{data.aiErrors}</span></div>
        </div>
      </div>

      {/* Provider Status */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">PROVIDER STATUS</div>
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white/60">
            NETWORK <span className={`text-${data.networkStatus === 'online' ? 'green-400' : 'red-400'}`}>{data.networkStatus.toUpperCase()}</span>
          </div>
          <div className="text-white/60">ERRORS <span className="text-white">{data.providerErrors}</span></div>
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">STORAGE</div>
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white/60">USED <span className="text-white">{data.storageUsed} KB</span></div>
          <div className="text-white/60">STATUS <span className={`text-${data.storageStatus === 'ok' ? 'green-400' : 'yellow-400'}`}>{data.storageStatus.toUpperCase()}</span></div>
        </div>
      </div>

      {/* Episode Progress */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">EPISODE PROGRESS</div>
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white/60">SHOW <span className="text-white">{data.currentShow}</span></div>
          <div className="text-white/60">POSITION <span className="text-white">S{pad2(data.currentSeason)}E{pad2(data.currentEpisode)}</span></div>
          <div className="text-white/60">SERVER <span className="text-white">{data.currentServer}</span></div>
        </div>
      </div>
    </div>
  );
}
