/* ========================================
   卿卿日常 · 存储封装（localStorage + Supabase 云端同步）
   使用纯 REST API（fetch），不依赖 Supabase JS SDK / CDN
   ======================================== */

const Storage = {
  // 云端同步开关（true=双写，localStorage + Supabase）
  cloudSync: true,

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
    } catch (e) {
      console.warn('[Storage] set failed:', key, e);
    }
    // 云端同步
    if (this.cloudSync) this._cloudUpsert(key, value);
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] remove failed:', key, e);
    }
    if (this.cloudSync) this._cloudDelete(key);
  },

  // --- 云端操作（纯 REST API） ---

  async _cloudUpsert(key, value) {
    try {
      await Supabase.upsert('user_data', {
        key,
        value,
        updated_at: new Date().toISOString(),
      }, 'key');
    } catch (e) {
      console.warn('[Storage] cloud upsert error:', key, e.message);
    }
  },

  async _cloudDelete(key) {
    try {
      await Supabase.delete(`user_data?key=eq.${encodeURIComponent(key)}`);
    } catch (e) {
      console.warn('[Storage] cloud delete error:', key, e.message);
    }
  },

  // 从云端拉取所有数据并同步到本地（启动时调用）
  async syncFromCloud() {
    if (!this.cloudSync) return;
    try {
      const data = await Supabase.get('user_data?select=key,value');
      if (!data || data.length === 0) return;

      let synced = 0;
      for (const row of data) {
        const localRaw = localStorage.getItem(row.key);
        const localData = localRaw ? JSON.parse(localRaw) : null;
        const localTime = localData && localData._updatedAt ? new Date(localData._updatedAt).getTime() : 0;
        const cloudTime = row.value && row.value._updatedAt ? new Date(row.value._updatedAt).getTime() : 0;

        // 云端更新才覆盖本地（_updatedAt 不存在时云端优先）
        if (cloudTime >= localTime) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
          synced++;
        }
      }
      console.log(`[Storage] 云端同步完成，同步 ${synced}/${data.length} 条`);
    } catch (e) {
      console.warn('[Storage] cloud sync error:', e.message);
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

// 暴露到全局，确保所有模块能访问
window.Storage = Storage;
