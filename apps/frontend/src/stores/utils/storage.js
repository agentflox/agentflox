import * as CreateWebStorage from "redux-persist/lib/storage/createWebStorage";

const isBrowser = typeof window !== "undefined";

const createNoopStorage = () => ({
  getItem(_key) {
    return Promise.resolve(null);
  },
  setItem(_key, value) {
    return Promise.resolve(value);
  },
  removeItem(_key) {
    return Promise.resolve();
  },
});

const createWebStorage = CreateWebStorage.default ?? CreateWebStorage;

const storage = isBrowser ? createWebStorage("local") : createNoopStorage();

export default storage;