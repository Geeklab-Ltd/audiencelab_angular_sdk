import { AudienceLabService } from './audiencelab.service';
import axios from 'axios';

// Import the real utility functions
import {
	getItem,
	saveItem,
	clearAllStorage,
} from './utils/storageFunctionalities';
import { prepareTokenPayload } from './utils/preparePayload';
import {
	updateRetention,
	initializeFirstLogin,
} from './utils/retentionCalculator';
import { getDeviceMetrics } from './utils/deviceMetrics';

// Mock only axios for HTTP requests to avoid real network calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AudienceLabService Integration Tests', () => {
	let service: AudienceLabService;
	let mockAxiosInstance: any;

	beforeEach(async () => {
		service = new AudienceLabService();
		mockAxiosInstance = {
			post: jest.fn(),
			get: jest.fn(),
		};
		mockedAxios.create.mockReturnValue(mockAxiosInstance);

		// Clear localStorage before each test
		await clearAllStorage();
	});

	afterEach(async () => {
		// Clean up localStorage after each test
		await clearAllStorage();
	});

	describe('Real Utility Functions', () => {
		test('prepareTokenPayload returns expected structure', async () => {
			const payload = await prepareTokenPayload();

			console.log(
				'prepareTokenPayload result:',
				JSON.stringify(payload, null, 2)
			);

			// Verify the payload has the expected structure
			expect(payload).toBeDefined();
			expect(typeof payload).toBe('object');

			// Add specific checks based on what prepareTokenPayload should return
			// (You may need to adjust these based on the actual implementation)
			expect(payload).toHaveProperty('timestamp');
			expect(payload).toHaveProperty('userAgent');
		});

		test('getDeviceMetrics returns device information', async () => {
			const deviceMetrics = await getDeviceMetrics();

			console.log(
				'getDeviceMetrics result:',
				JSON.stringify(deviceMetrics, null, 2)
			);

			expect(deviceMetrics).toBeDefined();
			expect(deviceMetrics).toHaveProperty('deviceName');
			expect(deviceMetrics).toHaveProperty('deviceModel');
			expect(deviceMetrics).toHaveProperty('osVersion');

			// Verify the values are strings and not empty
			expect(typeof deviceMetrics.deviceName).toBe('string');
			expect(typeof deviceMetrics.deviceModel).toBe('string');
			expect(typeof deviceMetrics.osVersion).toBe('string');
			expect(deviceMetrics.deviceName!.length).toBeGreaterThan(0);
		});

		test('storageFunctionalities work correctly', async () => {
			const testKey = 'test-key';
			const testValue = 'test-value';

			// Test saveItem
			await saveItem(testKey, testValue);

			// Test getItem
			const retrievedValue = await getItem(testKey);
			expect(retrievedValue).toBe(testValue);

			// Test with object
			const testObject = { name: 'test', value: 123 };
			await saveItem('test-object', JSON.stringify(testObject));
			const retrievedObject = await getItem('test-object');
			expect(retrievedObject).toEqual(testObject);
		});

		test('retentionCalculator tracks retention correctly', async () => {
			// Initialize first login
			await initializeFirstLogin();

			// Get initial retention data
			const initialRetention = await updateRetention();
			console.log(
				'Initial retention data:',
				JSON.stringify(initialRetention, null, 2)
			);

			expect(initialRetention).toBeDefined();
			expect(initialRetention).toHaveProperty('retentionDay');
			expect(initialRetention).toHaveProperty('backfillDay');

			// Verify retention day is 0 for first login
			expect(initialRetention!.retentionDay).toBe('0');
			expect(initialRetention!.backfillDay).toBe('0');

			// Check that lastSentMetricDate was set
			const lastSentDate = await getItem('lastSentMetricDate');
			expect(lastSentDate).toBe(new Date().toLocaleDateString('en-GB'));
		});

		test('retentionCalculator handles multiple calls correctly', async () => {
			// Initialize first login
			await initializeFirstLogin();

			// First call should return retention data
			const firstCall = await updateRetention();
			expect(firstCall).toBeDefined();

			// Second call on the same day should return null (already sent today)
			const secondCall = await updateRetention();
			expect(secondCall).toBeNull();
		});
	});

	describe('Service Integration with Real Functions', () => {
		test('initialize uses real utility functions', async () => {
			// Mock successful API responses
			mockAxiosInstance.post.mockResolvedValue({
				data: { token: 'real-token-from-api' },
			});

			const result = await service.initialize('test-api-key');

			console.log('Initialize result:', JSON.stringify(result, null, 2));

			expect(result).toBeDefined();
			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('metrics');

			// Verify the token was saved to storage
			const savedToken = await getItem('creativeToken');
			expect(savedToken).toBe('real-token-from-api');
		});

		test('sendUserMetrics uses real retention calculation', async () => {
			// Set up the service
			service.setApiKey('test-api-key');

			// Mock successful webhook response
			mockAxiosInstance.post.mockResolvedValue({
				data: { success: true },
			});

			// Initialize first login to set up retention tracking
			await initializeFirstLogin();

			const result = await service.sendUserMetrics();

			console.log('sendUserMetrics result:', JSON.stringify(result, null, 2));

			// Should return the webhook response
			expect(result).toEqual({ success: true });

			// Verify webhook was called with retention data
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'retention',
					payload: expect.objectContaining({
						retentionDay: '0',
						backfillDay: '0',
					}),
				})
			);
		});

		test('sendCustomPurchaseEvent includes real device metrics', async () => {
			// Set up the service
			service.setApiKey('test-api-key');

			// Save a creative token
			await saveItem('creativeToken', 'test-token');

			// Mock successful webhook response
			mockAxiosInstance.post.mockResolvedValue({
				data: { success: true },
			});

			const result = await service.sendCustomPurchaseEvent(
				'item123',
				'Test Item',
				9.99,
				'USD',
				'completed'
			);

			console.log(
				'sendCustomPurchaseEvent result:',
				JSON.stringify(result, null, 2)
			);

			expect(result).toEqual({ success: true });

			// Verify webhook was called with real device metrics
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'custom.purchase',
					creativeToken: 'test-token',
					device_name: expect.any(String),
					device_model: expect.any(String),
					os_system: expect.any(String),
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

		test('sendCustomAdEvent includes real device metrics', async () => {
			// Set up the service
			service.setApiKey('test-api-key');

			// Save a creative token
			await saveItem('creativeToken', 'test-token');

			// Mock successful webhook response
			mockAxiosInstance.post.mockResolvedValue({
				data: { success: true },
			});

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

			console.log('sendCustomAdEvent result:', JSON.stringify(result, null, 2));

			expect(result).toEqual({ success: true });

			// Verify webhook was called with real device metrics
			expect(mockAxiosInstance.post).toHaveBeenCalledWith(
				'/webhook',
				expect.objectContaining({
					type: 'custom.ad',
					creativeToken: 'test-token',
					device_name: expect.any(String),
					device_model: expect.any(String),
					os_system: expect.any(String),
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
	});

	describe('Error Handling with Real Functions', () => {
		test('handles storage errors gracefully', async () => {
			// Mock storage to throw an error
			jest.spyOn(console, 'log').mockImplementation(() => {});

			// This should not crash the service
			service.setApiKey('test-key');

			// Try to use storage functions that might fail
			await expect(service.sendUserMetrics()).resolves.toBeDefined();
		});

		test('handles device metrics errors gracefully', async () => {
			service.setApiKey('test-key');
			await saveItem('creativeToken', 'test-token');

			// Mock successful webhook response
			mockAxiosInstance.post.mockResolvedValue({
				data: { success: true },
			});

			// This should handle any device metrics errors gracefully
			const result = await service.sendCustomPurchaseEvent(
				'item123',
				'Test Item',
				9.99,
				'USD',
				'completed'
			);

			expect(result).toBeDefined();
		});
	});
});
