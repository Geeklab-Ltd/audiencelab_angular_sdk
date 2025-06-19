# Geeklab AudienceLab Angular SDK

The Geeklab AudienceLab SDK is a powerful tool for integrating audience analytics and event tracking into your **Angular** applications.

## Installation

```bash
npm install @geeklab.app/audiencelab-angular-sdk
```

## Usage

Import the `AudienceLabService` and use it in your Angular components or services.

### Basic Example

```typescript
import { AudienceLabService } from '@geeklab.app/audiencelab-angular-sdk';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
	constructor(private audienceLab: AudienceLabService) {}

	async ngOnInit() {
		// Initialize the SDK - this automatically fetches a creative token
		// and sends retention metrics (only once per day)
		await this.audienceLab.initialize('YOUR_API_KEY');

		// Send a purchase event (creative token is automatically included)
		await this.audienceLab.sendCustomPurchaseEvent(
			'item123',
			'Premium Upgrade',
			9.99,
			'USD',
			'completed'
		);

		// Send an ad event (creative token is automatically included)
		await this.audienceLab.sendCustomAdEvent(
			'ad456',
			'Rewarded Video',
			'AdMob',
			30,
			true,
			'AdMob',
			'main',
			0.1,
			'USD'
		);
	}
}
```

## How It Works

### Creative Token Management

1. **Automatic Fetching**: When you call `initialize()`, the SDK automatically fetches a creative token from the AudienceLab backend
2. **Caching**: The token is cached in localStorage and reused for subsequent requests
3. **Automatic Inclusion**: All events (purchase, ad, retention) automatically include the creative token in their payload

### Retention Events

1. **Daily Limit**: Retention events are automatically sent only once per day (24-hour period)
2. **Automatic Tracking**: The SDK tracks user retention days since first login
3. **Initialization**: Retention metrics are sent during the `initialize()` call
4. **Storage**: Uses localStorage to track first login date and last sent date

## API Reference

### `initialize(apiKey: string): Promise<{ token: string, metrics: any }>`

Initializes the SDK with your API key and automatically:

- Fetches and caches a creative token
- Sends retention metrics (only once per day)
- Sets up the SDK for subsequent event tracking

**Parameters:**

- `apiKey` (string): Your AudienceLab API key

**Returns:** Promise with token and metrics data

**Note:** This method handles all the setup automatically. You don't need to manually manage the creative token or retention events.

### `sendCustomPurchaseEvent(id: string, name: string, value: number, currency: string, status: string): Promise<any>`

Sends a custom purchase event to AudienceLab. The creative token is automatically included in the request.

**Parameters:**

- `id` (string): Unique identifier for the purchase item
- `name` (string): Name of the purchased item
- `value` (number): Purchase value/price
- `currency` (string): Currency code (e.g., 'USD', 'EUR')
- `status` (string): Purchase status (e.g., 'completed', 'pending', 'cancelled')

### `sendCustomAdEvent(adId: string, name: string, source: string, watchTime: number, reward: boolean, mediaSource: string, channel: string, value: number, currency: string): Promise<any>`

Sends a custom ad event to AudienceLab. The creative token is automatically included in the request.

**Parameters:**

- `adId` (string): Unique identifier for the ad
- `name` (string): Name of the ad event
- `source` (string): Ad source/platform
- `watchTime` (number): Time spent watching the ad in seconds
- `reward` (boolean): Whether the ad provided a reward
- `mediaSource` (string): Media source of the ad
- `channel` (string): Channel where the ad was displayed
- `value` (number): Ad value/revenue
- `currency` (string): Currency code

## Testing

Run the tests inside this directory with:

```bash
npm test
```

## Troubleshooting

- **API key errors**: Make sure you are using a valid API key. Replace `'YOUR_API_KEY'` with your actual API key.
- **Creative token issues**: The SDK automatically handles token fetching and caching. If you encounter token errors, try reinitializing the SDK.

## License

Check LICENSE.md
