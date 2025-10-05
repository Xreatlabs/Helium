const fetch = require("node-fetch");
const settings = require("../settings.json");

module.exports = (userid, db) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pterodactylUserId = await db.get("users-" + userid);
      
      if (!pterodactylUserId) {
        console.error(`[getPteroUser] No Pterodactyl user ID found for Discord user: ${userid}`);
        return reject("No Pterodactyl account linked to this Discord account");
      }
      
      const url = `${settings.pterodactyl.domain}/api/application/users/${pterodactylUserId}?include=servers`;
      console.log(`[getPteroUser] Fetching user from: ${url}`);
      
      const cacheaccount = await fetch(url, {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      });
      
      const statusText = cacheaccount.statusText;
      const status = cacheaccount.status;
      
      console.log(`[getPteroUser] Response status: ${status} ${statusText}`);
      
      if (statusText === "Not Found" || status === 404) {
        return reject("Pterodactyl account not found!");
      }
      
      if (!cacheaccount.ok) {
        const errorText = await cacheaccount.text();
        console.error(`[getPteroUser] API error: ${status} - ${errorText}`);
        return reject(`Pterodactyl API error: ${status} ${statusText}`);
      }
      
      const responseText = await cacheaccount.text();
      let cacheaccountinfo;
      
      try {
        cacheaccountinfo = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[getPteroUser] JSON parse error:`, parseError);
        console.error(`[getPteroUser] Response text:`, responseText);
        return reject("Failed to parse Pterodactyl response");
      }
      
      resolve(cacheaccountinfo);
    } catch (error) {
      console.error(`[getPteroUser] Unexpected error:`, error);
      reject(error);
    }
  });
};
