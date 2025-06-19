import { AudienceLabService } from './audiencelab.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the utility modules
jest.mock('./utils/storageFunctionalities', () => ({
	getItem: jest.fn(),
	saveItem: jest.fn(),
	clearAllStorage: jest.fn(),
}));

jest.mock('./utils/preparePayload', () => ({
	prepareTokenPayload: jest.fn(),
}));

jest.mock('./utils/retentionCalculator', () => ({
	updateRetention: jest.fn(),
}));

jest.mock('./utils/deviceMetrics', () => ({
	getDeviceMetrics: jest.fn(),
}));

describe('AudienceLabService', () => {
	let service: AudienceLabService;
	let mockAxiosInstance: any;

	beforeEach(() => {
		service = new AudienceLabService();
		mockAxiosInstance = {
			post: jest.fn(),
			get: jest.fn(),
		};
		mockedAxios.create.mockReturnValue(mockAxiosInstance);

		// Clear all mocks
		jest.clearAllMocks();
	});

	describe('Basic functionality', () => {
		test('setApiKey and getApiKey', () => {
			service.setApiKey('test');
			expect(service.getApiKey()).toBe('test');
		});

		test('getApiKey throws when not set', () => {
			expect(() => service.getApiKey()).toThrow(
				'API key not set. Call initializeAudiencelab first.'
			);
		});

		test('setApiKey throws when empty', () => {
			expect(() => service.setApiKey('')).toThrow('API key cannot be empty');
		});

		test('createAxiosInstance uses api key', () => {
			service.setApiKey('abc');
			service.createAxiosInstance();
			expect(mockedAxios.create).toHaveBeenCalledWith(
				expect.objectContaining({
					baseURL: 'https://analytics.geeklab.app',
					headers: expect.objectContaining({ 'geeklab-api-key': 'abc' }),
				})
			);
		});

		test('handleError throws formatted message for 401', () => {
			expect(() =>
				service.handleError({ response: { status: 401, data: 'fail' } })
			).toThrow('API key is not valid.');
		});

		test('handleError throws formatted message for 400', () => {
			expect(() =>
				service.handleError({ response: { status: 400, data: 'bad request' } })
			).toThrow('Bad request, data not formatted properly.');
		});

		test('handleError throws formatted message for 404', () => {
			expect(() =>
				service.handleError({ response: { status: 404, data: 'not found' } })
			).toThrow('Request failed: not found');
		});

		test('handleError throws formatted message for 500', () => {
			expect(() =>
				service.handleError({ response: { status: 500, data: 'server error' } })
			).toThrow('Server error: server error');
		});

		test('handleError without response', () => {
			expect(() => service.handleError(new Error('oops'))).toThrow(
				'Failed to communicate with the server.'
			);
		});
	});

	describe('Initialization', () => {
		test('initialize throws when apiKey is empty', async () => {
			await expect(service.initialize('')).rejects.toThrow(
				'API key is required to initialize the SDK.'
			);
		});

		test('initialize sets api key and calls fetchCreativeToken and sendUserMetrics', async () => {
			const { getItem, saveItem } = require('./utils/storageFunctionalities');
			const { prepareTokenPayload } = require('./utils/preparePayload');
			const { updateRetention } = require('./utils/retentionCalculator');

			// Mock successful responses
			getItem.mockResolvedValue(null); // No cached token
			prepareTokenPayload.mockResolvedValue({ test: 'payload' });
			mockAxiosInstance.post.mockResolvedValue({
				data: { token: 'test-token' },
			});
			updateRetention.mockResolvedValue({
				retentionDay: '1',
				backfillDay: '0',
			});

			const result = await service.initialize('test-api-key');

			expect(service.getApiKey()).toBe('test-api-key');
			expect(result).toEqual({ token: 'test-token', metrics: undefined });
			expect(saveItem).toHaveBeenCalledWith('creativeToken', 'test-token');
		});

		test('initialize uses cached token when available', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { updateRetention } = require('./utils/retentionCalculator');

			// Mock cached token
			getItem.mockResolvedValue('cached-token');
			updateRetention.mockResolvedValue({
				retentionDay: '1',
				backfillDay: '0',
			});

			const result = await service.initialize('test-api-key');

			expect(result).toEqual({ token: 'cached-token', metrics: undefined });
			expect(mockAxiosInstance.post).not.toHaveBeenCalled(); // Should not fetch new token
		});
	});

	describe('Creative Token Management', () => {
		test('fetchCreativeToken returns cached token when available', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			getItem.mockResolvedValue('cached-token');

			const token = await service.fetchCreativeToken();

			expect(token).toBe('cached-token');
			expect(mockAxiosInstance.post).not.toHaveBeenCalled();
		});

		test('fetchCreativeToken fetches new token when no cache', async () => {
			const { getItem, saveItem } = require('./utils/storageFunctionalities');
			const { prepareTokenPayload } = require('./utils/preparePayload');

			service.setApiKey('test-key');
			getItem.mockResolvedValue(null);
			prepareTokenPayload.mockResolvedValue({ test: 'payload' });
			mockAxiosInstance.post.mockResolvedValue({
				data: { token: 'new-token' },
			});

			const token = await service.fetchCreativeToken();

			expect(token).toBe('new-token');
			expect(saveItem).toHaveBeenCalledWith('creativeToken', 'new-token');
			expect(mockAxiosInstance.post).toHaveBeenCalledWith('/fetch-token', {
				test: 'payload',
			});
		});

		test('fetchCreativeToken handles errors', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { prepareTokenPayload } = require('./utils/preparePayload');

			service.setApiKey('test-key');
			getItem.mockResolvedValue(null);
			prepareTokenPayload.mockResolvedValue({ test: 'payload' });
			mockAxiosInstance.post.mockRejectedValue({
				response: { status: 401, data: 'unauthorized' },
			});

			await expect(service.fetchCreativeToken()).rejects.toThrow(
				'API key is not valid.'
			);
		});
	});

	describe('Retention Events', () => {
		test('sendUserMetrics returns early if already sent today', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const today = new Date().toLocaleDateString('en-GB');
			getItem.mockResolvedValue(today);

			const result = await service.sendUserMetrics();

			expect(result).toBeUndefined();
		});

		test('sendUserMetrics sends retention data when not sent today', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { updateRetention } = require('./utils/retentionCalculator');
			const { getDeviceMetrics } = require('./utils/deviceMetrics');

			// Set API key for the service
			service.setApiKey('test-key');

			// Mock getItem for all keys used in sendUserMetrics and sendWebhookRequest
			getItem.mockImplementation((key: string) => {
				if (key === 'lastSentMetricDate') return Promise.resolve('yesterday');
				if (key === 'retentionDay') return Promise.resolve('2');
				if (key === 'creativeToken') return Promise.resolve('test-token');
				return Promise.resolve(null);
			});
			updateRetention.mockResolvedValue({
				retentionDay: '2',
				backfillDay: '1',
			});
			getDeviceMetrics.mockResolvedValue({
				deviceName: 'Test Device',
				deviceModel: 'Test Model',
				osVersion: 'Test OS',
			});
			mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

			const result = await service.sendUserMetrics();

			expect(result).toEqual({ success: true });
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'retention',
					creativeToken: 'test-token',
					retention_day: '2',
					payload: { retentionDay: '2', backfillDay: '1' },
				})
			);
		});

		test('sendUserMetrics handles updateRetention returning null', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { updateRetention } = require('./utils/retentionCalculator');

			getItem.mockResolvedValue('yesterday');
			updateRetention.mockResolvedValue(null);

			const result = await service.sendUserMetrics();

			expect(result).toBeUndefined();
			expect(mockAxiosInstance.post).not.toHaveBeenCalled();
		});
	});

	describe('Event Sending', () => {
		beforeEach(() => {
			service.setApiKey('test-key');
		});

		test('sendCustomPurchaseEvent sends correct data', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { getDeviceMetrics } = require('./utils/deviceMetrics');

			getItem.mockResolvedValue('test-token');
			getDeviceMetrics.mockResolvedValue({
				deviceName: 'Test Device',
				deviceModel: 'Test Model',
				osVersion: 'Test OS',
			});
			mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

			const result = await service.sendCustomPurchaseEvent(
				'item123',
				'Test Item',
				9.99,
				'USD',
				'completed'
			);

			expect(result).toEqual({ success: true });
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'custom.purchase',
					creativeToken: 'test-token',
					payload: {
						item_id: 'item123',
						item_name: 'Test Item',
						value: 9.99,
						currency: 'USD',
						status: 'completed',
					},
				})
			);
		});

		test('sendCustomAdEvent sends correct data', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { getDeviceMetrics } = require('./utils/deviceMetrics');

			getItem.mockResolvedValue('test-token');
			getDeviceMetrics.mockResolvedValue({
				deviceName: 'Test Device',
				deviceModel: 'Test Model',
				osVersion: 'Test OS',
			});
			mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

			const result = await service.sendCustomAdEvent(
				'ad123',
				'Test Ad',
				'AdMob',
				30,
				true,
				'AdMob',
				'main',
				0.1,
				'USD'
			);

			expect(result).toEqual({ success: true });
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'custom.ad',
					creativeToken: 'test-token',
					payload: {
						ad_id: 'ad123',
						name: 'Test Ad',
						source: 'AdMob',
						watch_time: 30,
						reward: true,
						media_source: 'AdMob',
						channel: 'main',
						value: 0.1,
						currency: 'USD',
					},
				})
			);
		});

		test('sendWebhookRequest includes all required fields', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { getDeviceMetrics } = require('./utils/deviceMetrics');

			// getItem is called for retentionDay and creativeToken
			getItem.mockImplementation((key: string) => {
				if (key === 'retentionDay') return Promise.resolve('5');
				if (key === 'creativeToken') return Promise.resolve('test-token');
				return Promise.resolve(null);
			});
			getDeviceMetrics.mockResolvedValue({
				deviceName: 'Test Device',
				deviceModel: 'Test Model',
				osVersion: 'Test OS',
			});
			mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

			const result = await service.sendWebhookRequest('test.event', {
				test: 'data',
			});

			expect(result).toEqual({ success: true });
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'test.event',
					created_at: expect.any(String),
					creativeToken: 'test-token',
					device_name: 'Test Device',
					device_model: 'Test Model',
					os_system: 'Test OS',
					utc_offset: expect.any(String),
					retention_day: '5',
					payload: { test: 'data' },
				})
			);
		});
	});

	describe('Error Handling', () => {
		test('initialize handles errors gracefully', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			getItem.mockRejectedValue(new Error('Storage error'));

			await expect(service.initialize('test-key')).rejects.toThrow(
				'Storage error'
			);
		});

		test('sendWebhookRequest handles network errors', async () => {
			const { getItem } = require('./utils/storageFunctionalities');
			const { getDeviceMetrics } = require('./utils/deviceMetrics');

			service.setApiKey('test-key');
			getItem.mockResolvedValue('test-token');
			getDeviceMetrics.mockResolvedValue({
				deviceName: 'Test Device',
				deviceModel: 'Test Model',
				osVersion: 'Test OS',
			});
			mockAxiosInstance.post.mockRejectedValue({
				response: { status: 500, data: 'server error' },
			});

			await expect(
				service.sendWebhookRequest('test.event', {})
			).rejects.toThrow('Server error: server error');
		});
	});
});
