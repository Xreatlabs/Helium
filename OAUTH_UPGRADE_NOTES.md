# OAuth System Upgrade - October 2025

## Summary
Completely rebuilt the OAuth authentication system from scratch with modern dependencies and best practices.

## What Was Changed

### New Files Created:
1. **`lib/sessionStore.js`** - Modern session store using `better-sqlite3-session-store`
2. **`api/oauth2.js`** - Brand new OAuth implementation (clean, well-documented)
3. **`middleware/auth.js`** - Authentication middleware for route protection
4. **`OAUTH_UPGRADE_NOTES.md`** - This file

### Files Backed Up (renamed .old.js):
1. **`api/oauth2.old.js`** - Old OAuth implementation (had session persistence issues)
2. **`session.old.js`** - Old Keyv-based session store (had key mismatch issues)

### Files Modified:
1. **`app.js`** - Updated to use new session store and removed problematic session validation

### New Dependencies Added:
- `better-sqlite3` - Fast, synchronous SQLite library
- `better-sqlite3-session-store` - Proven session store for Express
- `passport` - OAuth framework (installed but not used yet, for future enhancements)
- `passport-discord` - Discord OAuth strategy (for future use)

## Key Improvements

### 1. **Reliable Session Persistence**
- Uses `better-sqlite3-session-store` which is specifically designed for Express sessions
- Separate sessions table prevents conflicts with application data
- Automatic cleanup of expired sessions

### 2. **Clean Architecture**
- Single responsibility functions
- Clear error handling
- Comprehensive logging
- No duplicate session checks

### 3. **Modern OAuth Flow**
- Cleaner code structure
- Better error messages for users
- Proper scope validation
- All features preserved (J4R, auto-join, role packages, etc.)

### 4. **Session Security**
- `sameSite: 'lax'` prevents CSRF attacks
- `httpOnly` prevents XSS attacks
- 24-hour session expiration
- Automatic session renewal on activity

## How It Works

### Login Flow:
1. User visits `/login`
2. Redirected to Discord OAuth
3. Discord redirects back to `/callback` with authorization code
4. Server exchanges code for access token
5. Server fetches user info from Discord
6. Server creates/retrieves Pterodactyl account
7. Session is saved with user data
8. User redirected to dashboard

### Session Storage:
- Sessions stored in SQLite `sessions` table
- Format: `{ session_id, expires, data }`
- Data is JSON containing user info and Pterodactyl details
- Indexed by session_id and expires for fast lookups

## Testing

Before deploying:
1. Clear browser cookies completely
2. Restart the server
3. Try logging in
4. Verify session persists after redirect
5. Test logout
6. Test re-login

## Rollback Instructions

If issues occur:
```bash
# Restore old files
mv api/oauth2.old.js api/oauth2.js
mv session.old.js session.js

# Revert app.js changes (use git)
git checkout app.js

# Restart server
npm start
```

## Future Enhancements

Consider:
1. Using Passport.js for OAuth (already installed)
2. Adding refresh token support
3. Implementing "Remember Me" functionality
4. Adding 2FA support
5. Session analytics

## Notes

- The old Keyv-based session store had key prefix issues causing sessions to not be found
- The old OAuth had multiple redirect checks that created loops
- The new system is simpler and more reliable
- All original features are preserved

---

**Created:** October 1, 2025
**Author:** AI Assistant
**Tested:** Pending user verification

