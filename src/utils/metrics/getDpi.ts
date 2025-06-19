export const getDPI = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const dpi = window.devicePixelRatio;
      resolve(dpi);
    } catch (error) {
      reject(error);
    }
  });
};
