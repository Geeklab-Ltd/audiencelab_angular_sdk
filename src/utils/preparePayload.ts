import { getDeviceMetrics } from './deviceMetrics';

export const prepareTokenPayload = async () => {
	const deviceMetrics = await getDeviceMetrics();
	const currentDate = new Date();
	const createdAt = currentDate.toISOString();

	const postData = {
		device_name: deviceMetrics.deviceName,
		dpi: deviceMetrics.dpi ? Math.round(deviceMetrics.dpi) : 0,
		gpu_rendered: deviceMetrics.gpuRenderer,
		gpu_vendor: deviceMetrics.gpuVendor,
		gpu_version: deviceMetrics.gpuVersion,
		window_height: deviceMetrics.nativeHeight,
		legacy_height: deviceMetrics.legacyHeight,
		window_width: deviceMetrics.nativeWidth,
		legacy_width: deviceMetrics.legacyWidth,
		installed_fonts: deviceMetrics.installedFonts,
		low_battery_level: deviceMetrics.lowBatteryLevel,
		os_system: deviceMetrics.osVersion,
		device_model: deviceMetrics.deviceModel,
		timezone: deviceMetrics.timezone,
	};

	return {
		type: 'device-metrics',
		data: postData,
		created_at: createdAt,
	};
};
