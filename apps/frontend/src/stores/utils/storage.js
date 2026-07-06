const createNoopStorage = () => {
  return {
    getItem(_key) {
      return Promise.resolve(null);
    },
    setItem(_key, value) {
      return Promise.resolve(value);
    },
    removeItem(_key) {
      return Promise.resolve();
    },
  };
};

// Use a factory to avoid CJS/ESM interop issues in production Next.js builds.
// Importing createWebStorage at the top level resolves to the module object
// (not the function) in strict ESM mode, causing "a(...) is not a function".
// Requiring it inside a function forces correct CJS default resolution at runtime.
const createStorage = (type) => {
  if (typeof window === "undefined") return createNoopStorage();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createWebStorage = require("redux-persist/lib/storage/createWebStorage").default;
  return createWebStorage(type);
};

const storage = createStorage("local");

export default storage;
