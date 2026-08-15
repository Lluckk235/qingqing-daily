/* ========================================
   卿卿日常 · 存储封装（localStorage + Supabase 云端同步）
   使用纯 REST API（fetch），不依赖 Supabase JS SDK / CDN
   ======================================== */

const Storage = {
  // 云端同步仅在匿名身份建立后启用；RLS 按 user_id 隔离所有记录。
  cloudSync: true,
  localWriteMetaKey: 'qq_local_write_times_v1',
  writeQueues: new Map(),

  localWriteTimes() {
    try { return JSON.parse(localStorage.getItem(this.localWriteMetaKey) || '{}'); } catch (_) { return {}; }
  },

  markLocalWrite(key, time = Date.now()) {
    const times = this.localWriteTimes();
    times[key] = time;
    localStorage.setItem(this.localWriteMetaKey, JSON.stringify(times));
    return time;
  },

  localWriteTime(key) { return Number(this.localWriteTimes()[key] || 0); },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[Storage] get failed:', key, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.markLocalWrite(key);
    } catch (e) {
      console.warn('[Storage] set failed:', key, e);
    }
    // 云端同步
    if (this.cloudSync) this._cloudUpsert(key, value);
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      this.markLocalWrite(key);
    } catch (e) {
      console.warn('[Storage] remove failed:', key, e);
    }
    if (this.cloudSync) this._cloudDelete(key);
  },

  // --- 云端操作（纯 REST API） ---

  async _cloudUpsert(key, value) {
    if (!Supabase.isAuthenticated) return;
    const previous = this.writeQueues.get(key) || Promise.resolve();
    const write = previous.catch(() => {}).then(async () => {
      await Supabase.upsert('user_data', {
        user_id: Supabase.userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      }, 'user_id,key');
    }).catch(e => console.warn('[Storage] cloud upsert error:', key, e.message));
    this.writeQueues.set(key, write);
    return write;
  },

  async _cloudDelete(key) {
    if (!Supabase.isAuthenticated) return;
    try {
      await Supabase.delete(`user_data?user_id=eq.${encodeURIComponent(Supabase.userId)}&key=eq.${encodeURIComponent(key)}`);
    } catch (e) {
      console.warn('[Storage] cloud delete error:', key, e.message);
    }
  },

  // 从云端拉取所有数据并同步到本地（启动时调用）
  async syncFromCloud() {
    if (!this.cloudSync || !Supabase.isAuthenticated) return;
    try {
      const data = await Supabase.get(`user_data?select=key,value,updated_at&user_id=eq.${encodeURIComponent(Supabase.userId)}`);
      if (!data || data.length === 0) return;

      let synced = 0;
      const changedKeys = [];
      for (const row of data) {
        const localRaw = localStorage.getItem(row.key);
        const localData = localRaw ? JSON.parse(localRaw) : null;
        const localTime = this.localWriteTime(row.key);
        const cloudTime = new Date(row.updated_at || 0).getTime();

        if (row.key === 'challenges_v2' && Array.isArray(localData) && Array.isArray(row.value)) {
          const merged = this.mergeChallenges(localData, row.value);
          const changed = JSON.stringify(merged) !== JSON.stringify(localData);
          if (changed) localStorage.setItem(row.key, JSON.stringify(merged));
          const cloudMatches = JSON.stringify(merged) === JSON.stringify(row.value);
          if (!cloudMatches) {
            this.markLocalWrite(row.key);
            this._cloudUpsert(row.key, merged);
          }
          if (changed) { synced++; changedKeys.push(row.key); }
          continue;
        }

        // 云端更新才覆盖本地（_updatedAt 不存在时云端优先）
        if (cloudTime >= localTime) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
          this.markLocalWrite(row.key, cloudTime || Date.now());
          synced++;
          changedKeys.push(row.key);
        }
      }
      if (changedKeys.length) window.dispatchEvent(new CustomEvent('storage-cloud-sync', { detail: { keys: changedKeys } }));
      console.log(`[Storage] 云端同步完成，同步 ${synced}/${data.length} 条`);
    } catch (e) {
      console.warn('[Storage] cloud sync error:', e.message);
    }
  },

  // 目标每一项都带 updatedAt；跨设备同时打卡时，以该目标较新的版本为准，
  // 并保留另一台设备新增的目标，避免整份数组互相覆盖。
  mergeChallenges(localList, cloudList) {
    const newest = new Map();
    [...cloudList, ...localList].forEach(item => {
      if (!item?.id) return;
      const current = newest.get(item.id);
      if (!current || Number(item.updatedAt || item.time || 0) >= Number(current.updatedAt || current.time || 0)) newest.set(item.id, item);
    });
    const order = [...cloudList, ...localList].map(item => item?.id).filter((id, index, ids) => id && ids.indexOf(id) === index);
    return order.map(id => newest.get(id)).filter(Boolean);
  },

  // --- 数组辅助 ---
  getArray(key) {
    return this.get(key, []);
  },

  pushArray(key, item, maxLength = 50) {
    const arr = this.getArray(key);
    arr.unshift(item);
    if (arr.length > maxLength) arr.length = maxLength;
    this.set(key, arr);
    return arr;
  },

  updateArray(key, predicate, updater) {
    const arr = this.getArray(key);
    const idx = arr.findIndex(predicate);
    if (idx !== -1) {
      arr[idx] = updater(arr[idx]);
      this.set(key, arr);
    }
    return arr;
  },

  removeArray(key, predicate) {
    const arr = this.getArray(key);
    const filtered = arr.filter(item => !predicate(item));
    this.set(key, filtered);
    return filtered;
  },
};

// 暴露到全局，确保所有模块能访问
window.Storage = Storage;
