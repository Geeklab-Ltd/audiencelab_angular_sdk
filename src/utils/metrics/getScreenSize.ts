export const getScreenSize = async (): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    try {
      const width = window.screen.width;
      const height = window.screen.height;
      const screenSize = {
        width: width,
        height: height,
      };
      resolve(screenSize);
    } catch (error) {
      reject(error);
    }
  });
};
