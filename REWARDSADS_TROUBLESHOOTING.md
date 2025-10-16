# RewardsAds Error: "You can't buy for your platform"

## Problem
Getting error message "you can't buy for your platform" when trying to complete RewardsAds offers.

## Root Cause
This error comes directly from the RewardsAds SDK and indicates one of these issues:

### 1. Platform Not Verified/Activated
Your RewardsX platform needs to be properly verified and activated for transactions.

**Solution:**
1. Go to [dash.rewardsx.net](https://dash.rewardsx.net)
2. Navigate to your Platform settings
3. Check the platform status - it should be "Active" or "Verified"
4. Complete any pending verification steps
5. Ensure your platform is approved for live transactions

### 2. Reward Configuration Issues
The reward might not be properly configured or active.

**Solution:**
1. Go to [dash.rewardsx.net](https://dash.rewardsx.net) 
2. Navigate to "Rewards" section
3. Check your reward (ID: `YOUR_REWARD_ID`)
4. Ensure the reward is:
   - ✅ Status: Active/Published
   - ✅ Has offers configured
   - ✅ Is linked to your platform
   - ✅ Has proper payout settings
5. Try creating a new reward and use that Reward ID

### 3. Platform Payment/Payout Settings
RewardsX requires payment method configuration before allowing transactions.

**Solution:**
1. In your RewardsX dashboard, go to "Payment Settings" or "Billing"
2. Add a valid payment method
3. Configure payout settings
4. Accept the terms of service for transactions
5. Ensure your account balance/credits are sufficient

### 4. Geographic Restrictions
Some platforms have geo-restrictions that prevent certain users from accessing offers.

**Solution:**
1. Check your platform's geographic settings
2. Ensure your region is supported
3. Review any country restrictions in your RewardsX dashboard
4. Test with a VPN if necessary (for testing purposes)

### 5. Domain Verification
Your domain might not be verified or whitelisted.

**Solution:**
1. In RewardsX dashboard, go to "Platform Settings"
2. Add your domain: `https://dash.fairnodes.in`
3. Verify domain ownership (usually via DNS or meta tag)
4. Ensure HTTPS is enabled
5. Wait for domain approval

### 6. Test Mode vs Production Mode
Your platform might be in test/sandbox mode.

**Solution:**
1. Check if your platform is in "Test Mode" or "Sandbox"
2. Switch to "Production Mode" if ready
3. Or create test rewards specifically for sandbox testing
4. Verify you're using the correct API credentials for the mode

## Quick Fix Steps

### Step 1: Verify Platform Status
```bash
# Check your platform at:
https://dash.rewardsx.net/platforms/YOUR_PLATFORM_ID
```

Look for:
- ✅ Status: Active
- ✅ Verified: Yes
- ✅ Mode: Production (or Test if testing)

### Step 2: Check Reward Status
```bash
# Check your reward at:
https://dash.rewardsx.net/rewards/YOUR_REWARD_ID
```

Verify:
- ✅ Status: Active/Published
- ✅ Platform: Linked to YOUR_PLATFORM_ID
- ✅ Offers: Available

### Step 3: Test with New Reward
Create a fresh reward:
1. Go to RewardsX Dashboard
2. Create New Reward
3. Configure with simple settings
4. Get the new Reward ID
5. Update your `settings.json`:

```json
"rewardsads": {
  "enabled": true,
  "platformId": "YOUR_PLATFORM_ID",
  "secretKey": "YOUR_SECRET_KEY",
  "rewardId": "NEW_REWARD_ID_HERE",
  "domain": "https://dash.fairnodes.in",
  "rewardCoins": 10,
  "cooldownTime": 6400,
  "dailyLimit": 5
}
```

6. Restart your Helium server:
```bash
cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
npm restart
```

### Step 4: Contact RewardsX Support
If the above steps don't work, contact RewardsX support:

**Email:** support@rewardsx.net

**Include in your message:**
- Platform ID: `YOUR_PLATFORM_ID`
- Reward ID: `YOUR_REWARD_ID`
- Error message: "you can't buy for your platform"
- Request platform activation or review

## Testing Alternative: Use Different Reward Provider

While waiting for RewardsX support, you can use Linkvertise which is already working:

```json
"linkvertise": {
  "enabled": true,
  "userId": 1404566,
  "baseUrl": "https://link-to.net",
  "domain": "https://dash.fairnodes.in",
  "rewardCoins": 10,
  "cooldownTime": 6400,
  "dailyLimit": 5
}
```

## Current Configuration Check

Your current configuration looks correct:
- ✅ Platform ID: `YOUR_PLATFORM_ID`
- ✅ Secret Key: Set correctly
- ✅ Reward ID: `YOUR_REWARD_ID`
- ✅ Domain: `https://dash.fairnodes.in`
- ✅ Enabled: true

The issue is **not** with your Helium configuration - it's with the RewardsX platform setup.

## Expected Timeline

1. **Platform Verification:** 1-3 business days
2. **Domain Verification:** Instant to 24 hours  
3. **Payment Setup:** Instant
4. **Support Response:** 1-2 business days

## Checklist

Before contacting support, verify:
- [ ] Logged into dash.rewardsx.net
- [ ] Platform status is "Active" or "Verified"
- [ ] Reward status is "Active" or "Published"
- [ ] Domain is verified
- [ ] Payment method is configured
- [ ] Terms of service are accepted
- [ ] Account is not suspended
- [ ] Sufficient balance/credits available

## Alternative Solution: Create New Platform

If your current platform has issues, you can create a new one:

1. Create new platform at dash.rewardsx.net
2. Complete verification immediately
3. Create a new reward
4. Update settings.json with new credentials:
   - New Platform ID
   - New Secret Key  
   - New Reward ID
5. Restart Helium

## Next Steps

1. ✅ Log into [dash.rewardsx.net](https://dash.rewardsx.net)
2. ✅ Check your platform status
3. ✅ Verify reward configuration
4. ✅ Complete any pending verifications
5. ✅ Contact support if needed with platform details

---

**Note:** The error "you can't buy for your platform" is a RewardsX-side restriction, not a Helium integration issue. Your implementation is correct and will work once the platform is properly activated.
