export const fetchGpuInfo = async (): Promise<{
	renderer: string;
	vendor: string;
	version: string;
}> => {
	return new Promise((resolve, reject) => {
		try {
			const canvas = document.createElement('canvas');
			// Use type assertion here
			const gl = (canvas.getContext('webgl') ||
				canvas.getContext(
					'experimental-webgl'
				)) as WebGLRenderingContext | null;

			if (!gl) {
				throw new Error(
					'Unable to initialize WebGL. Your browser may not support it.'
				);
			}

			const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

			if (debugInfo) {
				const gpuInfo = {
					renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
					vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
					version: gl.getParameter(gl.VERSION) as string,
				};
				resolve(gpuInfo);
			} else {
				throw new Error(
					'WEBGL_debug_renderer_info is not supported by your browser.'
				);
			}
		} catch (error) {
			reject(error);
		}
	});
};
