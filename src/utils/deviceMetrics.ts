import { getDPI } from './metrics/getDpi';
import { fetchGpuInfo } from './metrics/getGpuData';
import { getScreenSize } from './metrics/getScreenSize';
import { getInstalledFonts } from './metrics/getInstalledFonts';
import { getBatteryLevel } from './metrics/getBatteryLevel';
import { getTimezone } from './metrics/getTimezone';
import { FONTLIST } from './metrics/fontList';

export const getDeviceMetrics = async () => {
	try {
		const metrics: {
			deviceName?: string;
			deviceModel?: string;
			osVersion?: string;
			dpi?: number;
			gpuRenderer?: string;
			gpuVendor?: string;
			gpuVersion?: string;
			nativeWidth?: number;
			nativeHeight?: number;
			legacyWidth?: number;
			legacyHeight?: number;
			installedFonts?: string[];
			lowBatteryLevel?: boolean;
			timezone?: string;
		} = {};

		// Fetch dpi, gpu info object, screen size, timezone, installed fonts and battery level
		const results = await Promise.allSettled([
			getDPI(),
			fetchGpuInfo(),
			getScreenSize(),
			getTimezone(),
			getInstalledFonts(FONTLIST),
			getBatteryLevel(),
		]);

		// DPI
		if (results[0].status === 'fulfilled') metrics.dpi = results[0].value;

		// GPU
		if (results[1].status === 'fulfilled') {
			metrics.gpuRenderer = results[1].value.renderer || undefined;
			metrics.gpuVendor = results[1].value.vendor || undefined;
			metrics.gpuVersion = results[1].value.version || undefined;
		}

		// Screen size
		if (results[2].status === 'fulfilled') {
			metrics.legacyWidth = results[2].value.width;
			metrics.legacyHeight = results[2].value.height;
			metrics.nativeWidth =
				results[2].value.width * (window.devicePixelRatio || 1);
			metrics.nativeHeight =
				results[2].value.height * (window.devicePixelRatio || 1);
		}

		// Get device info from navigator and window
		const userAgent = window.navigator.userAgent;
		const platform = navigator.platform || 'Unknown';

		// Parse user agent for device details
		metrics.deviceName = platform || 'Unknown';
		metrics.deviceModel = 'Unknown'; // Not reliably available in web
		const osVersionMatch = userAgent.match(
			/(?:(?:OS|Windows NT|Android) )(\d+[._]\d+)/
		);
		metrics.osVersion = osVersionMatch ? osVersionMatch[1] : 'Unknown';

		// Timezone
		if (results[3].status === 'fulfilled') metrics.timezone = results[3].value;

		// Installed fonts
		if (results[4].status === 'fulfilled')
			metrics.installedFonts = results[4].value;

		// Battery level
		if (results[5].status === 'fulfilled')
			metrics.lowBatteryLevel = results[5].value;

		return metrics;
	} catch (error) {
		console.error('Error retrieving device metrics:', error);
		return {
			deviceName: 'Unknown',
			deviceModel: 'Unknown',
			osVersion: 'Unknown',
			dpi: 1,
			gpuRenderer: 'Unknown',
			gpuVendor: 'Unknown',
			gpuVersion: 'N/A',
			nativeWidth: 0,
			nativeHeight: 0,
			legacyWidth: 0,
			legacyHeight: 0,
			installedFonts: [],
			lowBatteryLevel: false,
			timezone: 'Unknown',
		};
	}
};
