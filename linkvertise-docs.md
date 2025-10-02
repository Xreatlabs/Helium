# Linkvertise Integration Setup

This guide explains how to enable and configure Linkvertise rewards in Helium. When a user completes a Linkvertise flow and returns to your dashboard, they are granted coins (default: 10).

## Prerequisites
- A running Helium instance with a public domain (HTTPS recommended).
- Access to `settings.json` to configure the integration.
- Linkvertise links (campaigns) that can redirect users back to your site.

## Enable Linkvertise
1. Open `settings.json` and locate `api.client.linkvertise`.
2. Configure the block as needed:

```
"api": {
  "client": {
    "linkvertise": {
      "enabled": true,
      "rewardCoins": 10,
      "requireKnownLink": true,
      "links": [
        {
          "id": "support-1",
          "name": "Support us via Linkvertise",
          "url": "https://linkvertise.com/12345/support?target=https://your-domain/linkvertise/callback?id=support-1"
        }
      ]
    }
  }
}
```

Notes:
- `enabled`: toggles the feature.
- `rewardCoins`: number of coins granted per completion.
- `requireKnownLink`: when `true`, only callbacks with a matching `id` from `links[]` are accepted.
- `links[]`: define your Linkvertise links; the `url` should ultimately redirect users to your callback on completion.

## Callback URL
- The callback route is `GET /linkvertise/callback`.
- Include a link identifier: `id=<your-link-id>`.
- Example: `https://your-domain/linkvertise/callback?id=support-1`.

Your Linkvertise link should send users to the callback when finished. If your Linkvertise builder supports a destination/target URL, set it directly to your callback URL. If it uses a `target` query parameter, ensure it points to the same callback.

## Sidebar and Page
- When `enabled` is `true`, the “Linkvertise” item appears in the sidebar automatically.
- The page is available at `/linkvertise` and lists the configured links.

## Ratelimits
- `settings.json` includes a ratelimit entry for the callback: `"/linkvertise/callback": 1` (1 second window).

## Cooldown and Abuse Protection
- A cooldown of 10 minutes per user/link is enforced server-side. If triggered repeatedly, users see `err=COOLDOWN`.
- Set `requireKnownLink` to `true` so only configured link IDs are accepted.
- Consider serving the dashboard over HTTPS and using Cloudflare or similar.

## Webhooks
- On successful reward, Helium fires a `coins.added` event via the webhook system. Configure webhooks in `/webhooks` if you want notifications.

## Testing
1. Log in as a user.
2. Visit `/linkvertise` — your links should appear.
3. Click a Linkvertise link and complete the steps.
4. You should be redirected to `/linkvertise?err=none`, and your coin balance increases by `rewardCoins`.

## Troubleshooting
- `DISABLED`: Set `api.client.linkvertise.enabled` to `true`.
- `INVALID_LINK`: The `id` in the callback isn’t present in `links[]` while `requireKnownLink` is `true`.
- `COOLDOWN`: Wait 10 minutes before trying again for the same link.
- No links shown: Ensure `links[]` is populated and accessible.
- Not logged in: The page and callback require login; you’ll be redirected to `/login`.

## Security Considerations
- This integration grants coins when the user reaches the callback. For stronger validation, Linkvertise may offer postback or API verification; integrate that if you need hardened checks.
- Keep `requireKnownLink` enabled to block unknown callbacks.

## Example Configuration (Production)
```
"linkvertise": {
  "enabled": true,
  "rewardCoins": 10,
  "requireKnownLink": true,
  "links": [
    {
      "id": "support-1",
      "name": "Support us via Linkvertise",
      "url": "https://linkvertise.com/12345/support?target=https://dash.example.com/linkvertise/callback?id=support-1"
    }
  ]
}
```

That’s it — once enabled and configured, users can earn coins via Linkvertise from `/linkvertise`.

