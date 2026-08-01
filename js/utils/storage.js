/* ========================================
   卿卿日常 · 存储封装（localStorage + Supabase 云端同步）
   ======================================== */

const Storage = {
  // 云端同步开关（true=双写，localStorage + Supabase）
  cloudSync: true,

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage.get failed:', key, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage.set failed:', key, e);
    }
    // 云端同步
    if (this.cloudSync) this._cloudUpsert(key, value);
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage.remove failed:', key, e);
    }
    if (this.cloudSync) this._cloudDelete(key);
  },

  // --- 云端操作 ---
  async _cloudUpsert(key, value) {
    try {
      const { error } = await window.supabaseClient
        .from('user_data')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) console.warn('Cloud upsert failed:', key, error.message);
    } catch (e) {
      console.warn('Cloud upsert error:', key, e.message);
    }
  },

  async _cloudDelete(key) {
    try {
      const { error } = await window.supabaseClient.from('user_data').delete().eq('key', key);
      if (error) console.warn('Cloud delete failed:', key, error.message);
    } catch (e) {
      console.warn('Cloud delete error:', key, e.message);
    }
  },

  // 从云端拉取所有数据并同步到本地（启动时调用）
  async syncFromCloud() {
    if (!this.cloudSync) return;
    try {
      const { data, error } = await window.supabaseClient.from('user_data').select('key,value');
      if (error) { console.warn('Cloud sync failed:', error.message); return; }
      if (!data || data.length === 0) return;

      for (const row of data) {
        const localRaw = localStorage.getItem(row.key);
        const localData = localRaw ? JSON.parse(localRaw) : null;
        const localTime = localData && localData._updatedAt ? new Date(localData._updatedAt).getTime() : 0;
        const cloudTime = row.value && row.value._updatedAt ? new Date(row.value._updatedAt).getTime() : 0;

        // 云端更新才覆盖本地
        if (cloudTime > localTime) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        }
      }
    } catch (e) {
      console.warn('Cloud sync error:', e.message);
    }
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
