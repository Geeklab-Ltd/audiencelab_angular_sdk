const saveItem = async (key: string, value: string): Promise<void> => {
  try {
    // Ensure we're storing a plain string value, not an object
    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : value;
    localStorage.setItem(key, stringValue);
  } catch (error) {
    if (error instanceof Error) {
      console.log("LocalStorage Error: " + error.message);
    } else {
      console.log("LocalStorage Error: Unknown error occurred");
    }
  }
};

const getItem = async (key: string): Promise<string | null> => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    // If the value looks like a Promise result object, return null
    if (value.includes('"_h":0') && value.includes('"_i":0')) {
      return null;
    }

    try {
      // Only parse if it looks like JSON
      if (value.startsWith("{") || value.startsWith("[")) {
        return JSON.parse(value);
      }
      return value;
    } catch {
      return value;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("LocalStorage Error: " + error.message);
    } else {
      console.log("LocalStorage Error: Unknown error occurred");
    }
    return null;
  }
};

const clearAllStorage = async (): Promise<void> => {
  try {
    localStorage.clear();
  } catch (error) {
    if (error instanceof Error) {
      console.log("LocalStorage Error: " + error.message);
    } else {
      console.log("LocalStorage Error: Unknown error occurred");
    }
  }
};

export { saveItem, getItem, clearAllStorage };
