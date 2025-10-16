# RewardsAds Integration Setup Guide

This guide explains how to set up RewardsAds in Helium to allow users to earn coins by completing offers.

## Overview

RewardsAds integration allows users to watch ads and complete offers to earn coins. The implementation uses the official RewardsAds SDK from [RewardsX](https://rewardsx.net).

## Prerequisites

1. A RewardsX account at [dash.rewardsx.net](https://dash.rewardsx.net)
2. A verified platform on RewardsX
3. At least one reward configured on your platform

## Step 1: Get Your Credentials

### 1.1 Create Your Platform
1. Go to [dash.rewardsx.net](https://dash.rewardsx.net)
2. Create a new platform for your website
3. Complete the platform verification process

### 1.2 Get Platform Credentials
After creating your platform, you'll receive:
- **Platform ID**: Format `ptm-XXXXXXXXXXXXX-XXX`
- **Secret Key**: A long hexadecimal string

### 1.3 Create a Reward
1. In your RewardsX dashboard, navigate to "Rewards"
2. Create a new reward for your platform
3. Note down the **Reward ID** (you'll need this for configuration)

## Step 2: Configure Helium

Open `settings.json` and locate the `api.client.rewardsads` section:

```json
"rewardsads": {
  "enabled": true,
  "platformId": "YOUR_PLATFORM_ID",
  "secretKey": "YOUR_SECRET_KEY",
  "rewardId": "YOUR_REWARD_ID",
  "_note": "Your RewardsAds platform credentials and reward ID from dash.rewardsx.net",
  "domain": "https://your-domain.com",
  "rewardCoins": 10,
  "cooldownTime": 3600,
  "dailyLimit": 5,
  "_dailyLimit_note": "Maximum number of times a user can use RewardsAds per day (0 = unlimited)"
}
```

### Configuration Parameters

| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `enabled` | Enable/disable RewardsAds | Yes | `true` |
| `platformId` | Your platform ID from RewardsX | Yes | `"YOUR_PLATFORM_ID"` |
| `secretKey` | Your platform secret key | Yes | `"61aa2e9e..."` |
| `rewardId` | Your reward ID from RewardsX | Yes | `"rwd-123456"` |
| `domain` | Your website domain | Yes | `"https://dash.example.com"` |
| `rewardCoins` | Coins awarded per completion | Yes | `10` |
| `cooldownTime` | Seconds between uses (per user) | Optional | `3600` |
| `dailyLimit` | Max uses per day (0 = unlimited) | Optional | `5` |

## Step 3: Verify Installation

1. Restart your Helium server
2. Log in to your dashboard
3. Navigate to `/linkvertise` (the earning page)
4. You should see both Linkvertise and RewardsAds options

## How It Works

### User Flow
1. User clicks "Start Earning" on the RewardsAds card
2. System checks daily limits and generates a secure one-time token
3. User is redirected to the RewardsAds offer page
4. RewardsAds SDK loads and displays the offer
5. User completes the offer
6. On success, user is redirected back with their reward
7. System validates the token and awards coins

### Security Features
- **One-time tokens**: Each session uses a unique, single-use token
- **User validation**: Tokens are tied to specific user IDs
- **Session verification**: User must be logged in with matching account
- **Daily limits**: Prevents abuse with configurable daily usage limits
- **Cooldown system**: Optional cooldown between uses

### Database Keys
RewardsAds uses the following database keys:
- `rewardsads-token-{token}`: One-time token data
- `rewardsads-daily-{userId}-{date}`: Daily usage tracking
- `coins-{userId}`: User's coin balance

## API Endpoints

### GET /api/user/earn/l4r/rewardsads/start
Initiates a RewardsAds earning session.

**Requirements:**
- User must be logged in
- RewardsAds must be enabled
- User must not have reached daily limit

**Flow:**
1. Validates user session
2. Checks daily limits
3. Creates one-time token
4. Redirects to `/rewardsads/start` with token

### GET /rewardsads/start
Displays the RewardsAds offer page.

**Query Parameters:**
- `user_id`: User ID
- `token`: One-time token

**Response:**
- HTML page with RewardsAds SDK initialized
- Renders the reward offer using `RewardADsSDK.renderReward()`
- Handles success/error callbacks

### GET /rewardsads/callback
Validates completion and awards coins.

**Query Parameters:**
- `user_id`: User ID
- `token`: One-time token

**Validation:**
1. Checks if RewardsAds is enabled
2. Validates token and user match
3. Ensures token hasn't been used
4. Verifies user session

**On Success:**
- Awards coins to user
- Tracks daily usage
- Triggers webhook notifications
- Redirects to dashboard with success message

## Customization

### Changing Reward Amount
Update `rewardCoins` in settings.json:
```json
"rewardCoins": 20
```

### Adjusting Daily Limits
Change `dailyLimit` (0 = unlimited):
```json
"dailyLimit": 10
```

### Modifying Cooldown
Update `cooldownTime` in seconds:
```json
"cooldownTime": 7200
```

### Custom Button Text
Edit the SDK configuration in `lib/rewardsads-client.js`:
```javascript
buyText: 'Complete Offer',
cancelText: 'Cancel'
```

## Troubleshooting

### RewardsAds Not Showing
**Issue:** RewardsAds card doesn't appear on `/linkvertise` page

**Solutions:**
1. Check `rewardsads.enabled` is `true` in settings.json
2. Verify all required fields are configured (platformId, secretKey, rewardId)
3. Restart the Helium server
4. Check server logs for initialization errors

### "SDK not loaded" Error
**Issue:** RewardsAds SDK fails to load

**Solutions:**
1. Check internet connectivity
2. Verify `https://sdk.rewardsx.net/rewardads.js` is accessible
3. Check browser console for CORS or CSP errors
4. Ensure your domain is whitelisted in RewardsX dashboard

### Daily Limit Reached
**Issue:** Users see "Daily Limit Reached" message

**Solutions:**
1. Increase `dailyLimit` in settings.json
2. Set `dailyLimit` to `0` for unlimited uses
3. Wait 24 hours for limit to reset
4. Manually clear daily usage from database (advanced)

### Token Invalid Error
**Issue:** "Token validation failed" error

**Possible Causes:**
1. Token already used (one-time only)
2. User ID mismatch
3. Token expired or corrupted
4. Database connection issues

**Solutions:**
1. Generate a new token by starting over
2. Check database connectivity
3. Review server logs for specific error messages

### No Coins Awarded
**Issue:** Offer completed but no coins received

**Checklist:**
1. Check if `REWARDSADS_SUCCESS` message appears on dashboard
2. Verify `rewardCoins` is set correctly in settings.json
3. Check webhook logs for errors
4. Manually verify coin balance in database

## Integration with Other Features

### Webhooks
RewardsAds rewards trigger the `coins.added` webhook event:
```javascript
await onCoinsAdded(userId, username, rewardAmount);
```

Configure webhooks in `/webhooks` to receive notifications.

### Logging
RewardsAds actions are logged if logging is enabled:
- User earns coins from RewardsAds
- Daily limits reached
- Token validation failures

### Dashboard Messages
Success messages appear on the dashboard after completing offers. Customize these in `views/general/dashboard.ejs`.

## Official Documentation

For more information about the RewardsAds SDK:
- Official Docs: [docs.rewardsx.net/rewardads](https://docs.rewardsx.net/rewardads/)
- Dashboard: [dash.rewardsx.net](https://dash.rewardsx.net)
- Support: [support@rewardsx.net](mailto:support@rewardsx.net)

## Advanced: Server-Side Callbacks

For production environments, consider implementing server-side reward verification:

1. Set up a callback endpoint in RewardsX dashboard
2. Verify reward completion server-side
3. Award coins only after server verification

This provides additional security against client-side manipulation.

## FAQ

**Q: Can users earn from both Linkvertise and RewardsAds?**
A: Yes! Both systems have independent daily limits and tracking.

**Q: How do I get more rewards?**
A: Create additional rewards in your RewardsX dashboard. Currently, one reward is configured per platform.

**Q: Is RewardsAds free to use?**
A: Check the RewardsX pricing at [rewardsx.net](https://rewardsx.net) for current terms.

**Q: Can I use custom domains?**
A: Yes, update the `domain` field in settings.json to match your production domain.

**Q: How do I test RewardsAds locally?**
A: You can test locally, but make sure to update the callback URL in settings.json to use localhost or ngrok.

## Support

For issues specific to:
- **Helium Integration**: Create an issue on the Helium GitHub repository
- **RewardsAds SDK**: Contact [support@rewardsx.net](mailto:support@rewardsx.net)
- **Account Issues**: Use the RewardsX dashboard support

---

**Last Updated:** January 2025
**SDK Version:** Official RewardsAds SDK
**Documentation:** [docs.rewardsx.net](https://docs.rewardsx.net)
