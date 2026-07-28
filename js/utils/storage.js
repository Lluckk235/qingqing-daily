/* ========================================
   卿卿日常 · localStorage 封装
   ======================================== */

const Storage = {
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
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage.remove failed:', key, e);
    }
  },

  // 获取数组，支持追加
  getArray(key) {
    return this.get(key, []);
  },

  // 追加到数组
  pushArray(key, item, maxLength = 50) {
    const arr = this.getArray(key);
    arr.unshift(item);
    if (arr.length > maxLength) arr.length = maxLength;
    this.set(key, arr);
    return arr;
  },

  // 更新数组中的某项
  updateArray(key, predicate, updater) {
    const arr = this.getArray(key);
    const idx = arr.findIndex(predicate);
    if (idx !== -1) {
      arr[idx] = updater(arr[idx]);
      this.set(key, arr);
    }
    return arr;
  },

  // 从数组中删除
  removeArray(key, predicate) {
    const arr = this.getArray(key);
    const filtered = arr.filter(item => !predicate(item));
    this.set(key, filtered);
    return filtered;
  },
};
