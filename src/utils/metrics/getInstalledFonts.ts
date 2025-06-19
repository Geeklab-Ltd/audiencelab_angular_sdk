export const getInstalledFonts = async (
  fontsToCheck: any
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    try {
      const baseFonts = ["monospace", "sans-serif", "serif"];
      const testString = "mmmmmmmmmmlli";
      const testSize = "72px";
      const span = document.createElement("span");
      let defaultWidths: Record<string, number> = {}; // Specify the type here
      let defaultHeights: Record<string, number> = {}; // Specify the type here
      let detectedFonts: string[] = [];

      span.style.fontSize = testSize;
      span.textContent = testString;
      document.body.appendChild(span);

      // Measure the default widths and heights with base fonts
      for (const baseFont of baseFonts) {
        span.style.fontFamily = baseFont;
        defaultWidths[baseFont] = span.offsetWidth;
        defaultHeights[baseFont] = span.offsetHeight;
      }

      // Check each font in the fontsToCheck array
      for (const font of fontsToCheck) {
        let isDetected = baseFonts.some((baseFont) => {
          span.style.fontFamily = `'${font}', ${baseFont}`;
          return (
            span.offsetWidth !== defaultWidths[baseFont] ||
            span.offsetHeight !== defaultHeights[baseFont]
          );
        });

        if (isDetected) {
          detectedFonts.push(font);
        }
      }

      document.body.removeChild(span);
      resolve(detectedFonts);
    } catch (error) {
      reject(error);
    }
  });
};
