/**
 * RewardsAds Client - Official SDK wrapper for RewardsAds integration
 * Based on official documentation: https://docs.rewardsx.net/rewardads/
 * @module rewardsads-client
 */

class RewardsAdsClient {
  constructor(options = {}) {
    this.platformId = options.platform_id || null;
    this.secretKey = options.secret_key || null;
    this.rewardId = options.reward_id || null;
  }

  /**
   * Generate the SDK initialization and reward rendering script
   * @param {string} platformId - The RewardsAds platform ID
   * @param {string} secretKey - The RewardsAds secret key
   * @param {string} rewardId - The reward ID to render
   * @param {string} callbackUrl - Success callback URL
   * @param {number} rewardCoins - Coins to award
   * @returns {string} - HTML script with SDK initialization and reward rendering
   */
  generateSDKScript(platformId, secretKey, rewardId, callbackUrl, rewardCoins) {
    const platform = platformId || this.platformId;
    const secret = secretKey || this.secretKey;
    const reward = rewardId || this.rewardId;
    
    if (!platform) {
      throw new Error('Platform ID is required for RewardsAds');
    }

    if (!secret) {
      throw new Error('Secret Key is required for RewardsAds');
    }

    if (!reward) {
      throw new Error('Reward ID is required for RewardsAds');
    }

    return `
<script src="https://sdk.rewardsx.net/rewardads.js"></script>
<script>
// Initialize RewardADs SDK
RewardADsSDK.init("${platform}", "${secret}");

// Wait for SDK to be ready and render reward
setTimeout(function() {
  const container = document.getElementById('rewardsads-container');
  if (container && RewardADsSDK.renderReward) {
    RewardADsSDK.renderReward(container, {
      rewardId: '${reward}',
      buyText: 'Complete Offer',
      cancelText: 'Cancel',
      onSuccess: function(result) {
        console.log('RewardsAds: Offer completed successfully!', result);
        // Redirect to success callback
        window.location.href = '${callbackUrl}';
      },
      onError: function(error) {
        console.error('RewardsAds: Offer failed', error);
        alert('Failed to complete offer. Please try again.');
      }
    });
  } else {
    console.error('RewardsAds container not found or SDK not loaded');
  }
}, 1000);
</script>
    `.trim();
  }

}

module.exports = RewardsAdsClient;
