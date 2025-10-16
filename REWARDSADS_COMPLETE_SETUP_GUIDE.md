# Complete RewardsAds Setup & Verification Guide
## Step-by-Step Instructions to Fix "You Can't Buy For Your Platform"

---

## 🎯 OVERVIEW

This guide will walk you through EVERY step needed to set up and verify your RewardsAds platform. Follow each section in order.

**Your Credentials:**
- Platform ID: `YOUR_PLATFORM_ID` (format: ptm-XXXXXXXXXXXXX-XXX)
- Secret Key: `YOUR_SECRET_KEY` (long hexadecimal string)
- Reward ID: `YOUR_REWARD_ID` (format: rwd-XXXXXXXXXXXXX-XXX)
- Domain: `https://your-domain.com`

---

## 📋 SECTION 1: ACCESS YOUR REWARDSX DASHBOARD

### Step 1.1: Login to RewardsX
1. Open your browser and go to: **https://dash.rewardsx.net**
2. If you're not logged in, click **"Sign In"** button (top-right corner)
3. Enter your email and password
4. Click **"Login"** or **"Sign In"**
5. You should now see the main dashboard

### Step 1.2: Understand Dashboard Layout
After logging in, you'll see a sidebar (left side) with these menu items:
- 📊 **Dashboard** (Home/Overview)
- 🏢 **Platforms** (Your platforms list)
- 🎁 **Rewards** (Your rewards list)
- 📊 **Analytics** (Statistics)
- 💳 **Billing** or **Payments** (Payment settings)
- ⚙️ **Settings** (Account settings)
- 📖 **Documentation** (Help docs)

---

## 🏢 SECTION 2: VERIFY YOUR PLATFORM STATUS

### Step 2.1: Navigate to Platforms
1. On the left sidebar, click **"Platforms"**
2. You should see a list of your platforms
3. Look for platform with ID: **YOUR_PLATFORM_ID**
4. Click on it to open platform details

### Step 2.2: Check Platform Status
On the platform details page, look for these indicators:

**Status Field:**
- ✅ **ACTIVE** = Good! Platform is working
- ⚠️ **PENDING** = Needs verification
- ❌ **SUSPENDED** = Contact support
- 🔄 **IN_REVIEW** = Wait for approval

**Verification Status:**
- ✅ **VERIFIED** = Domain and identity verified
- ⚠️ **NOT_VERIFIED** = Need to complete verification
- 🔄 **VERIFICATION_PENDING** = Waiting for approval

**Mode:**
- 🧪 **TEST/SANDBOX** = Testing mode (limited functionality)
- 🚀 **PRODUCTION/LIVE** = Full functionality

### Step 2.3: What Each Status Means

| Status | What It Means | Action Required |
|--------|---------------|-----------------|
| Active + Verified + Production | ✅ Everything working | None - should work! |
| Active + Not Verified | ⚠️ Need verification | Complete Section 3 |
| Pending | ⚠️ Waiting approval | Check verification steps |
| Test/Sandbox | 🧪 Testing only | Switch to Production (see below) |
| Suspended | ❌ Account issue | Contact support immediately |

### Step 2.4: Switch from Test to Production Mode
If your platform shows **"Test"** or **"Sandbox"** mode:

1. On platform details page, look for **"Mode"** or **"Environment"** setting
2. Find a toggle or dropdown to switch modes
3. Click **"Switch to Production"** or **"Enable Live Mode"**
4. You may need to:
   - Accept terms of service
   - Verify payment method
   - Complete verification steps
5. Click **"Save"** or **"Confirm"**

---

## ✅ SECTION 3: COMPLETE PLATFORM VERIFICATION

### Step 3.1: Find Verification Section
1. While viewing your platform details (YOUR_PLATFORM_ID)
2. Look for tabs at the top of the page:
   - Overview
   - **Verification** ← Click this
   - Settings
   - API Keys
   - Domains
3. Click on **"Verification"** tab

### Step 3.2: Types of Verification Required

You may need to complete one or more of these:

#### A) Email Verification
1. Look for **"Email Status"** 
2. If shows "Not Verified":
   - Click **"Send Verification Email"**
   - Check your email inbox
   - Click the verification link
   - Return to dashboard
3. Status should now show: ✅ **Email Verified**

#### B) Phone Verification (if required)
1. Look for **"Phone Verification"**
2. If required:
   - Enter your phone number
   - Click **"Send Code"**
   - Enter the 6-digit code you receive via SMS
   - Click **"Verify"**
3. Status should show: ✅ **Phone Verified**

#### C) Identity Verification (if required)
1. Look for **"Identity Verification"** or **"KYC"**
2. You may need to provide:
   - Full name
   - Country
   - Address
   - Business information (if applicable)
3. Fill in all required fields
4. Click **"Submit for Review"**
5. Wait for approval (usually 1-3 business days)

#### D) Domain Verification
1. Look for **"Domain Verification"** section
2. Enter your domain: `your-domain.com`
3. Choose verification method:

**Option 1: DNS Verification (Recommended)**
- Copy the TXT record provided (looks like: `rewardsx-verify=abc123def456`)
- Go to your domain DNS settings (your hosting provider)
- Add a new DNS TXT record:
  - Type: `TXT`
  - Name/Host: `@` or `your-domain.com`
  - Value: (paste the verification code)
  - TTL: `3600` or `Auto`
- Save DNS record
- Wait 5-60 minutes for DNS propagation
- Return to RewardsX and click **"Verify Domain"**

**Option 2: Meta Tag Verification**
- Copy the meta tag provided (looks like: `<meta name="rewardsx-verify" content="abc123">`)
- Add this to the `<head>` section of your website homepage
- RewardsX will scan: `https://your-domain.com`
- Click **"Verify Domain"**

**Option 3: File Upload Verification**
- Download the verification file (e.g., `rewardsx-verification.txt`)
- Upload it to your website root: `https://your-domain.com/rewardsx-verification.txt`
- Make sure it's publicly accessible
- Click **"Verify Domain"**

### Step 3.3: Check Verification Progress
1. After completing steps, look for **"Verification Status"**
2. It should show progress:
   - ✅ Email: Verified
   - ✅ Domain: Verified
   - 🔄 Identity: Pending (if required)
3. If any show ❌ or ⚠️, click on them to see what's needed

---

## 🎁 SECTION 4: VERIFY YOUR REWARD CONFIGURATION

### Step 4.1: Navigate to Rewards
1. Click **"Rewards"** in the left sidebar
2. You should see a list of all your rewards
3. Find the reward with ID: **YOUR_REWARD_ID**
4. Click on it to open reward details

**If you DON'T see your reward:**
- It might not exist or was deleted
- Skip to **Section 5** to create a new reward

### Step 4.2: Check Reward Status
On the reward details page, verify these settings:

**Status:**
- ✅ **ACTIVE** or **PUBLISHED** = Good!
- ⚠️ **DRAFT** = Need to publish
- ❌ **DISABLED** = Need to enable
- 🔄 **PENDING** = Wait for approval

**Platform Link:**
- Should show: **YOUR_PLATFORM_ID**
- If different, this reward is for another platform!

**Offers Available:**
- Should show: **Yes** or a number (e.g., "5 offers")
- If shows **0** or **None**, no offers are configured

### Step 4.3: Publish Reward (if Draft)
If reward status shows **"Draft"**:
1. Review all reward settings
2. Look for a button: **"Publish"** or **"Activate"**
3. Click it
4. Confirm when prompted
5. Status should change to **"Active"** or **"Published"**

### Step 4.4: Enable Reward (if Disabled)
If reward status shows **"Disabled"**:
1. Look for a toggle switch or button
2. Click **"Enable"** or toggle ON
3. Click **"Save"** if prompted
4. Status should change to **"Active"**

### Step 4.5: Configure Reward Settings
1. While viewing reward details, check these tabs:
   - **Overview** (Basic info)
   - **Offers** (Available offers)
   - **Settings** (Advanced settings)
   - **Tracking** (Conversion tracking)

2. Click **"Settings"** tab
3. Verify these settings:

**Reward Type:**
- Should be set to appropriate type (e.g., "Offer Wall", "Single Offer")

**Targeting:**
- **Countries**: Make sure your country/region is included
- If specific countries are selected, ensure your users' countries are listed
- Consider selecting **"All Countries"** for testing

**Device Types:**
- ✅ Desktop
- ✅ Mobile
- ✅ Tablet
- (Enable all for maximum compatibility)

**Payout Settings:**
- Verify payout amount is set
- Check if minimum balance is met

**Callback URL (Optional):**
- Can be left empty for now
- Or set to: `https://your-domain.com/rewardsads/callback`

4. Click **"Save"** or **"Update"** at the bottom

### Step 4.6: Check Offers
1. Click on **"Offers"** tab
2. You should see a list of available offers
3. Check if offers are available:
   - ✅ **5+ offers** = Good!
   - ⚠️ **0 offers** = Problem! See Section 4.7

**Offer Status:**
- Each offer should show: ✅ **Active**
- If ❌ **Inactive**, click to enable them

### Step 4.7: If No Offers Are Available
This is a COMMON issue causing the error!

**Solution 1: Enable Offer Networks**
1. Go to platform settings (not reward settings)
2. Look for **"Offer Networks"** or **"Integrations"**
3. You should see a list of offer providers:
   - AdGate Media
   - Offertoro
   - CPX Research
   - Revenue Universe
   - Others...
4. Enable at least 2-3 networks:
   - Click the toggle to **ON**
   - Enter API keys if required (get from each network)
   - Click **"Save"**
5. Return to your reward and check if offers now appear

**Solution 2: Geographic Restrictions**
1. In reward settings, go to **"Targeting"**
2. Under **"Countries"**, select:
   - ✅ **"All Countries"** (recommended for testing)
   - OR manually add your target countries
3. Under **"Regions"**, ensure your region is included
4. Click **"Save"**

**Solution 3: Contact Support**
If still no offers:
1. Email: **support@rewardsx.net**
2. Subject: "No offers available for reward YOUR_REWARD_ID"
3. Include your Platform ID and ask for offer network activation

---

## 💳 SECTION 5: CONFIGURE PAYMENT SETTINGS

### Step 5.1: Navigate to Billing/Payments
1. Click **"Billing"** or **"Payments"** in left sidebar
2. You should see payment dashboard

### Step 5.2: Add Payment Method
1. Look for **"Payment Methods"** section
2. Click **"Add Payment Method"** button
3. Choose payment type:
   - Credit/Debit Card
   - PayPal
   - Bank Account
   - Crypto (if available)
4. Enter payment details:
   - Card number / PayPal email / Bank info
   - Billing address
   - Contact information
5. Click **"Save"** or **"Add"**
6. Verify payment method (may require small verification charge)

### Step 5.3: Configure Payout Settings
1. Look for **"Payout Settings"** or **"Withdrawal Settings"**
2. Set your preferred payout method:
   - PayPal (most common)
   - Bank transfer
   - Other options
3. Set minimum payout threshold (e.g., $10, $50)
4. Click **"Save"**

### Step 5.4: Accept Terms of Service
1. Look for **"Terms of Service"** or **"Agreements"**
2. You may need to accept:
   - ✅ Terms of Service
   - ✅ Privacy Policy
   - ✅ Payment Terms
3. Check each box and click **"Accept"** or **"Agree"**

### Step 5.5: Add Initial Balance (if required)
Some platforms require initial balance:
1. Look for **"Add Funds"** or **"Top Up"**
2. Add a small amount (e.g., $10-$20) for testing
3. Choose payment method
4. Complete payment
5. Wait for balance to appear

---

## 🆕 SECTION 6: CREATE NEW REWARD (RECOMMENDED)

If your current reward has issues, create a fresh one:

### Step 6.1: Create New Reward
1. Click **"Rewards"** in left sidebar
2. Click **"Create New Reward"** or **"+ New Reward"** button
3. Fill in the form:

**Basic Information:**
- **Reward Name**: `Helium Dashboard Coins`
- **Description**: `Complete offers to earn coins for Helium dashboard`
- **Platform**: Select `YOUR_PLATFORM_ID`
- **Reward Type**: Choose `Offer Wall` or `Single Offer`

**Targeting:**
- **Countries**: Select **"All Countries"** (for testing)
- **Devices**: Enable All (Desktop, Mobile, Tablet)
- **Languages**: Select **"All"** or your preferred languages

**Payout:**
- **Payout Amount**: Set appropriate amount
- **Currency**: USD or your currency

**Advanced Settings:**
- **Conversion Tracking**: Enable if you want detailed tracking
- **Callback URL**: Leave empty or set to `https://your-domain.com/rewardsads/callback`
- **Security**: Enable fraud prevention

4. Click **"Create"** or **"Save"**
5. **COPY THE NEW REWARD ID** (looks like: `rwd-XXXXXXXXXXXXX-XXX`)

### Step 6.2: Update Helium Configuration
1. Open your terminal/SSH
2. Edit settings file:
```bash
cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
nano settings.json
```

3. Find the `rewardsads` section and update `rewardId`:
```json
"rewardsads": {
  "enabled": true,
  "platformId": "YOUR_PLATFORM_ID",
  "secretKey": "YOUR_SECRET_KEY",
  "rewardId": "YOUR_NEW_REWARD_ID_HERE",
  "domain": "https://your-domain.com",
  "rewardCoins": 10,
  "cooldownTime": 6400,
  "dailyLimit": 5
}
```

4. Save file: Press `Ctrl+X`, then `Y`, then `Enter`

5. Restart Helium:
```bash
pkill -f "nodemon app.js"
npm start
```

---

## 🌐 SECTION 7: DOMAIN VERIFICATION DETAILED

### Step 7.1: Method 1 - DNS TXT Record (Recommended)

**For Cloudflare Users:**
1. Log in to Cloudflare dashboard
2. Select your domain: `fairnodes.in`
3. Click **"DNS"** in left menu
4. Click **"+ Add record"**
5. Fill in:
   - Type: `TXT`
   - Name: `dash` (or `@` if RewardsX specifies)
   - Content: (paste verification code from RewardsX)
   - TTL: `Auto`
   - Proxy: `DNS only` (gray cloud)
6. Click **"Save"**
7. Wait 5-10 minutes
8. Return to RewardsX and click **"Verify"**

**For cPanel/Other Hosting:**
1. Log in to your hosting control panel
2. Find **"Zone Editor"** or **"DNS Management"**
3. Select domain: `fairnodes.in`
4. Click **"Add Record"** or **"Add TXT Record"**
5. Fill in:
   - Host: `dash` or `your-domain.com`
   - TXT Value: (paste verification code)
   - TTL: `14400` or leave default
6. Click **"Save"** or **"Add"**
7. Wait 15-60 minutes
8. Return to RewardsX and click **"Verify"**

### Step 7.2: Method 2 - Meta Tag Verification

1. Copy meta tag from RewardsX (looks like):
```html
<meta name="rewardsx-verify" content="abc123def456ghi789">
```

2. Add to your Helium dashboard homepage:
```bash
cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
nano views/general/dashboard.ejs
```

3. Find the `<head>` section (near line 1-10)
4. Add the meta tag:
```html
<head>
  <meta name="rewardsx-verify" content="YOUR_VERIFICATION_CODE">
  <!-- other existing head content -->
</head>
```

5. Save: `Ctrl+X`, `Y`, `Enter`

6. Restart server:
```bash
pkill -f "nodemon app.js"
npm start
```

7. Test if meta tag is visible:
```bash
curl -s https://your-domain.com | grep rewardsx
```

8. Return to RewardsX and click **"Verify Domain"**

### Step 7.3: Method 3 - File Upload Verification

1. Download verification file from RewardsX
2. Upload to your server:
```bash
cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
# Upload the file here or in a public directory
```

3. Make it accessible via URL:
```bash
# The file should be accessible at:
# https://your-domain.com/rewardsx-verification.txt
```

4. Test file is accessible:
```bash
curl https://your-domain.com/rewardsx-verification.txt
```

5. Return to RewardsX and click **"Verify Domain"**

---

## 🧪 SECTION 8: TESTING YOUR SETUP

### Step 8.1: Quick Platform Test
1. On RewardsX dashboard, go to your platform page
2. Look for **"Test"** or **"Preview"** button
3. Click it to open test environment
4. Try completing a test offer
5. If it works, your platform is properly configured!

### Step 8.2: Test from Helium Dashboard
1. Open browser and go to: `https://your-domain.com`
2. Log in to your account
3. Navigate to: `https://your-domain.com/linkvertise`
4. Click **"Complete RewardsAds"** purple button
5. Click **"Start Earning — +10 coins"**
6. You should see the RewardsAds offer page
7. Try completing an offer

### Step 8.3: Check for Errors
If you still get errors:

1. Open browser console (F12 or Right-click → Inspect → Console)
2. Look for error messages
3. Common errors:

**"Platform not verified"**
- Complete Section 3 (Verification)

**"No offers available"**
- Complete Section 4.7 (Enable offer networks)

**"Domain not authorized"**
- Complete Section 7 (Domain verification)

**"Insufficient balance"**
- Complete Section 5.5 (Add funds)

**"Geographic restriction"**
- Change reward targeting to "All Countries"

### Step 8.4: Test with Direct SDK Test
1. Open: `https://your-domain.com/test-rewardsads.html`
2. Check console messages
3. Look for specific SDK errors
4. Note any error codes

---

## 🐛 SECTION 9: COMMON ERRORS & SOLUTIONS

### Error: "You can't buy for your platform"

**Meaning:** Platform is not approved for transactions

**Solutions (in order):**
1. ✅ Verify platform status is "Active"
2. ✅ Complete all verification steps (Section 3)
3. ✅ Ensure domain is verified (Section 7)
4. ✅ Switch from Test to Production mode (Section 2.4)
5. ✅ Add payment method (Section 5)
6. ✅ Create new reward (Section 6)
7. ✅ Contact support with Platform ID

### Error: "No offers available"

**Meaning:** No offer networks are configured

**Solutions:**
1. Enable offer networks (Section 4.7)
2. Change geographic targeting to "All Countries"
3. Wait 30 minutes for offers to populate
4. Contact support to activate offer networks

### Error: "Domain not authorized"

**Meaning:** Your domain is not verified

**Solutions:**
1. Complete domain verification (Section 7)
2. Ensure verification method is working
3. Wait for DNS propagation (if using DNS method)
4. Try alternative verification method

### Error: "Platform suspended"

**Meaning:** Account has been suspended

**Solutions:**
1. Check email for suspension notice
2. Contact support immediately
3. Review terms of service for violations
4. Provide requested documentation

---

## 📧 SECTION 10: CONTACTING REWARDSX SUPPORT

### When to Contact Support
- Platform stuck in "Pending" for more than 3 days
- Verification fails repeatedly
- No offers available after 24 hours
- Platform suspended without reason
- Payment issues

### How to Contact Support

**Email:** support@rewardsx.net

**Subject Line:**
```
[Platform: YOUR_PLATFORM_ID] Issue with platform verification
```

**Email Template:**
```
Hello RewardsX Support Team,

I need assistance with my RewardsAds platform.

Platform Details:
- Platform ID: YOUR_PLATFORM_ID
- Reward ID: YOUR_REWARD_ID
- Domain: your-domain.com
- Email: [Your registered email]

Issue Description:
[Describe your specific issue here]

Error Message:
"you can't buy for your platform"

Steps Already Taken:
1. Completed email verification
2. Attempted domain verification via [DNS/Meta Tag/File]
3. [List other steps you've tried]

Request:
Please review my platform and activate it for live transactions.
I need to enable RewardsAds offers for my Helium dashboard users.

Thank you for your assistance.

Best regards,
[Your Name]
```

### Support Response Time
- Email: 1-2 business days
- Platform verification: 1-3 business days
- Payment issues: 1 business day
- Technical issues: 2-3 business days

---

## ✅ SECTION 11: VERIFICATION CHECKLIST

Use this checklist to track your progress:

### Platform Configuration
- [ ] Logged into dash.rewardsx.net
- [ ] Found my platform (YOUR_PLATFORM_ID)
- [ ] Platform status is "Active"
- [ ] Platform mode is "Production" (not Test)
- [ ] Email verified
- [ ] Phone verified (if required)
- [ ] Identity verified (if required)

### Domain Verification
- [ ] Added domain: your-domain.com
- [ ] Chose verification method (DNS/Meta/File)
- [ ] Completed verification steps
- [ ] Verified domain successfully
- [ ] Domain shows "Verified" status

### Reward Configuration
- [ ] Found my reward (YOUR_REWARD_ID) OR created new reward
- [ ] Reward status is "Active" or "Published"
- [ ] Reward linked to correct platform
- [ ] Offers are available (5+ offers showing)
- [ ] Geographic targeting set to "All Countries" (for testing)
- [ ] All device types enabled

### Payment Settings
- [ ] Added payment method
- [ ] Configured payout settings
- [ ] Accepted terms of service
- [ ] Added initial balance (if required)

### Testing
- [ ] Tested from RewardsX dashboard preview
- [ ] Tested from Helium dashboard
- [ ] Offers load successfully
- [ ] No error messages
- [ ] Can complete test offer

### If Still Not Working
- [ ] Created new reward (Section 6)
- [ ] Updated settings.json with new Reward ID
- [ ] Restarted Helium server
- [ ] Tested again
- [ ] Contacted support with details

---

## 🎓 SECTION 12: UNDERSTANDING THE FLOW

To help you understand how everything connects:

```
User Journey:
1. User clicks "Complete RewardsAds" on Helium dashboard
   ↓
2. Helium creates one-time token for security
   ↓
3. User redirected to: /rewardsads/start?user_id=XXX&token=YYY
   ↓
4. Helium page loads RewardsAds SDK from: https://sdk.rewardsx.net/rewardads.js
   ↓
5. SDK initializes with your Platform ID and Secret Key
   ↓
6. SDK contacts RewardsX servers to:
   - Verify platform is active ← ERROR HAPPENS HERE IF NOT VERIFIED
   - Check domain is authorized
   - Fetch available offers
   - Display offer to user
   ↓
7. User completes offer
   ↓
8. RewardsX SDK calls onSuccess callback
   ↓
9. User redirected back to: /rewardsads/callback
   ↓
10. Helium validates token and awards coins
```

**The Error Point:**
Step 6 is where "you can't buy for your platform" occurs. This means RewardsX SDK is blocking the transaction because your platform is not fully verified/activated on their end.

---

## 📱 SECTION 13: QUICK START (TL;DR)

If you want the fastest path to fixing this:

1. **Login**: https://dash.rewardsx.net
2. **Check Platform**: Click "Platforms" → Find YOUR_PLATFORM_ID
3. **Verify Everything**:
   - Email: Click "Send Verification Email"
   - Domain: Add DNS TXT record or meta tag
   - Mode: Switch to "Production" if in "Test"
4. **Create New Reward**:
   - Click "Rewards" → "Create New"
   - Name it "Helium Coins"
   - Platform: YOUR_PLATFORM_ID
   - Countries: "All Countries"
   - Click "Create"
   - **Copy the new Reward ID**
5. **Update Helium**:
   ```bash
   cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
   nano settings.json
   # Update "rewardId": "YOUR_NEW_REWARD_ID"
   # Save and exit
   pkill -f "nodemon app.js"
   npm start
   ```
6. **Test**: Go to your-domain.com/linkvertise and try RewardsAds

If still doesn't work: Email support@rewardsx.net with Platform ID and ask for platform activation.

---

## 📞 GET HELP

**RewardsX Support:**
- Email: support@rewardsx.net
- Dashboard: https://dash.rewardsx.net
- Docs: https://docs.rewardsx.net

**Helium Support:**
- Your configuration is correct
- Issue is with RewardsX platform setup
- Once RewardsX approves your platform, everything will work

**Need More Help?**
Send me:
1. Screenshot of your platform status page
2. Screenshot of your reward settings page
3. Any error messages from browser console (F12)
4. What happens when you click "Complete RewardsAds"

---

**Good luck! Your Helium integration is perfect - just need RewardsX platform approval.** 🚀
