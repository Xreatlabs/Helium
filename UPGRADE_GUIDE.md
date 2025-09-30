# Upgrade Guide

## How to Update Helium Without Losing Your Configuration

This guide explains how to safely update Helium from the repository without overwriting your personal settings.

---

## 🔒 Protected Files

The following files contain your personal configuration and will **NOT** be overwritten when you pull updates:

- `settings.json` - Your Helium configuration
- `database.sqlite` - Your database
- `.env` - Environment variables (if using)

These files are in `.gitignore`, so Git will never touch them during updates.

---

## 📦 First Time Setup

If you're setting up Helium for the first time:

### 1. Run Setup Script
```bash
npm run setup
```

This will create `settings.json` and `.env` from the example files.

### 2. Configure Your Settings
Edit `settings.json` with your configuration:
```json
{
  "pterodactyl": {
    "domain": "https://your-panel.com",
    "key": "your_api_key"
  },
  "api": {
    "client": {
      "oauth2": {
        "id": "your_discord_client_id",
        "secret": "your_discord_client_secret",
        "link": "https://your-domain.com"
      }
    }
  }
}
```

### 3. Install & Migrate
```bash
npm install
npm run migrate
npm start
```

---

## 🔄 Updating Helium (Git Pull)

When new updates are available:

### 1. Backup Your Configuration (Optional but Recommended)
```bash
cp settings.json settings.json.backup
cp database.sqlite database.sqlite.backup
```

### 2. Pull Updates
```bash
git pull origin master
```

✅ **Your `settings.json` and `database.sqlite` will NOT be touched!**

### 3. Check for New Settings
Compare your `settings.json` with the new `settings.example.json`:

```bash
# Windows
fc settings.json settings.example.json

# Linux/Mac
diff settings.json settings.example.json
```

If `settings.example.json` has new fields, manually add them to your `settings.json`.

### 4. Install New Dependencies
```bash
npm install
```

### 5. Run New Migrations (if any)
```bash
npm run migrate
```

### 6. Restart
```bash
npm start
```

---

## 🆕 Checking for New Configuration Options

After pulling updates, always check `settings.example.json` for new options:

```bash
# View what's new in the example file
cat settings.example.json
```

Common new additions might include:
- New event types for webhooks
- New API endpoints
- New feature toggles
- New rate limits

---

## 🔧 Manual Configuration Migration

If you see new settings in `settings.example.json`, copy them to your `settings.json`:

**Example:** If the update adds a new webhook configuration:

```json
// settings.example.json (new)
{
  "api": {
    "webhooks": {
      "enabled": true,
      "retry_limit": 3
    }
  }
}
```

Add it to your `settings.json`:
```json
// settings.json (yours)
{
  "pterodactyl": { /* your existing config */ },
  "api": {
    "client": { /* your existing config */ },
    "webhooks": {
      "enabled": true,
      "retry_limit": 3
    }
  }
}
```

---

## 🚨 Troubleshooting

### "Application crashes after update"
**Solution:** Check for new required settings in `settings.example.json`

### "Missing configuration option"
**Solution:** Copy new fields from `settings.example.json` to `settings.json`

### "Database error after update"
**Solution:** Run `npm run migrate` to apply database updates

### "Dependencies error"
**Solution:** Delete `node_modules` and run `npm install` again

---

## 📋 Update Checklist

- [ ] Backup `settings.json` and `database.sqlite`
- [ ] Run `git pull origin master`
- [ ] Compare `settings.json` with `settings.example.json`
- [ ] Add any new configuration options
- [ ] Run `npm install`
- [ ] Run `npm run migrate`
- [ ] Restart application
- [ ] Test core functionality
- [ ] Check changelog for breaking changes

---

## 🔐 What's Protected vs What Updates

### ✅ Protected (Never Overwritten)
- `settings.json` - Your configuration
- `database.sqlite` - Your data
- `.env` - Your secrets
- Any files you create in the workspace

### 🔄 Updated (Pulled from Repository)
- `settings.example.json` - Template with latest options
- `.env.example` - Template with latest variables
- All code files (`app.js`, `api/`, `lib/`, etc.)
- `package.json` - Dependencies
- `migrations/` - Database migrations
- Documentation files

---

## 💡 Best Practices

1. **Always backup** before updating
2. **Read the changelog** before updating (see `CHANGELOG.md`)
3. **Test in development** before updating production
4. **Keep notes** of your custom modifications
5. **Review diffs** when merging configuration changes

---

## 🆘 Need Help?

1. Check `CHANGELOG.md` for breaking changes
2. Review `settings.example.json` for new options
3. Read `IMPLEMENTATION_SUMMARY.md` for technical details
4. Check GitHub issues for similar problems

---

**Remember:** Your `settings.json` is safe! Git will never overwrite it. 🎉
