export const getUserAgent = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const userAgent = navigator.userAgent;
      resolve(userAgent);
    } catch (error) {
      reject(error);
    }
  });
};
