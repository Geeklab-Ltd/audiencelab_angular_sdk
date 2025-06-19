export const getBatteryLevel = async (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      // inable to get battery level. Let's check if the video is autoplaying
      // video is #testVid and exists in the dom and should be autoplaying
      const video = document.getElementById("testVid") as HTMLVideoElement;
      if (video) {
        // if the video is playing resolve 100, else resolve 20
        // needs to be within an if else
        if (video.autoplay) {
          resolve(false);
        } else {
          resolve(true);
        }
      } else {
        reject(
          new Error("Battery Status API is not supported in this browser.")
        );
      }
    } catch (error) {
      reject(new Error("Failed to read battery level."));
    }
  });
};
