/**
 * Node Management API
 * Handles node limits, availability, and server capacity tracking
 */

const settings = require("../settings.json");
const fetch = require("node-fetch");

module.exports.load = async function (app, db) {
  
  // Fetch all nodes from Pterodactyl with current server counts
  app.get("/api/nodes/available", async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Fetch all nodes from Pterodactyl
      const nodesResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes?include=servers`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            Accept: "application/json",
          },
        }
      );

      if (!nodesResponse.ok) {
        return res.status(500).json({ error: "Failed to fetch nodes from panel" });
      }

      const nodesData = await nodesResponse.json();
      const availableNodes = [];

      for (const node of nodesData.data) {
        const nodeId = node.attributes.id;
        const nodeName = node.attributes.name;
        const locationId = node.attributes.location_id;

        // Get node limit from database
        const nodeLimit = await db.get(`node-limit-${nodeId}`);
        const limit = nodeLimit ? nodeLimit.limit : 0;
        
        // Count current servers on this node
        const currentServers = node.relationships?.servers?.data?.length || 0;

        // Get location info
        let locationName = `Location ${locationId}`;
        for (const [locKey, locValue] of Object.entries(settings.api.client.locations)) {
          if (locValue.nodes && locValue.nodes.includes(nodeId)) {
            locationName = locValue.name;
            break;
          }
        }

        // Check if node has space available
        const isAvailable = limit === 0 || currentServers < limit;

        availableNodes.push({
          id: nodeId,
          name: nodeName,
          location: locationName,
          locationId: locationId,
          currentServers: currentServers,
          limit: limit,
          available: isAvailable,
          percentUsed: limit > 0 ? Math.round((currentServers / limit) * 100) : 0,
        });
      }

      return res.json({ nodes: availableNodes });
    } catch (err) {
      console.error("Error fetching available nodes:", err);
      return res.status(500).json({ error: "Failed to fetch nodes" });
    }
  });

  // Admin: Set node limit
  app.post("/admin/nodes/setlimit", async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const userDb = await db.get("users-" + req.session.userinfo.id);
    if (!userDb || userDb.admin !== true) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { nodeId, limit } = req.body;

    if (!nodeId || limit === undefined) {
      return res.status(400).json({ error: "Missing nodeId or limit" });
    }

    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ error: "Invalid limit value" });
    }

    try {
      // Fetch node info from Pterodactyl
      const nodeResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes/${nodeId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            Accept: "application/json",
          },
        }
      );

      if (!nodeResponse.ok) {
        return res.status(404).json({ error: "Node not found" });
      }

      const nodeData = await nodeResponse.json();
      const nodeName = nodeData.attributes.name;

      // Store old limit for history
      const oldLimit = await db.get(`node-limit-${nodeId}`);

      // Save new limit
      await db.set(`node-limit-${nodeId}`, {
        limit: limitNum,
        name: nodeName,
        updatedAt: Date.now(),
        updatedBy: req.session.userinfo.username,
      });

      // Log the change
      const history = (await db.get(`node-limit-history-${nodeId}`)) || [];
      history.push({
        oldLimit: oldLimit ? oldLimit.limit : 0,
        newLimit: limitNum,
        changedBy: req.session.userinfo.username,
        changedAt: Date.now(),
      });
      await db.set(`node-limit-history-${nodeId}`, history);

      return res.json({
        success: true,
        message: `Node limit updated for ${nodeName}`,
        nodeId,
        limit: limitNum,
      });
    } catch (err) {
      console.error("Error setting node limit:", err);
      return res.status(500).json({ error: "Failed to set node limit" });
    }
  });

  // Admin: Get all nodes with limits
  app.get("/admin/nodes/list", async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const userDb = await db.get("users-" + req.session.userinfo.id);
    if (!userDb || userDb.admin !== true) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      // Fetch all nodes from Pterodactyl
      const nodesResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes?include=servers`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            Accept: "application/json",
          },
        }
      );

      if (!nodesResponse.ok) {
        return res.status(500).json({ error: "Failed to fetch nodes from panel" });
      }

      const nodesData = await nodesResponse.json();
      const nodesList = [];

      for (const node of nodesData.data) {
        const nodeId = node.attributes.id;
        const nodeName = node.attributes.name;
        const locationId = node.attributes.location_id;
        const fqdn = node.attributes.fqdn;
        const scheme = node.attributes.scheme;

        // Get node limit from database
        const nodeLimit = await db.get(`node-limit-${nodeId}`);
        const limit = nodeLimit ? nodeLimit.limit : 0;

        // Count current servers
        const currentServers = node.relationships?.servers?.data?.length || 0;

        // Get location name
        let locationName = `Location ${locationId}`;
        for (const [locKey, locValue] of Object.entries(settings.api.client.locations)) {
          if (locValue.nodes && locValue.nodes.includes(nodeId)) {
            locationName = locValue.name;
            break;
          }
        }

        nodesList.push({
          id: nodeId,
          name: nodeName,
          location: locationName,
          locationId: locationId,
          fqdn: fqdn,
          scheme: scheme,
          currentServers: currentServers,
          limit: limit,
          percentUsed: limit > 0 ? Math.round((currentServers / limit) * 100) : 0,
          status: limit === 0 ? 'no-limit' : (currentServers >= limit ? 'full' : 'available'),
        });
      }

      return res.json({ nodes: nodesList });
    } catch (err) {
      console.error("Error fetching nodes list:", err);
      return res.status(500).json({ error: "Failed to fetch nodes" });
    }
  });

  // Check if a specific node has capacity
  app.get("/api/nodes/check/:nodeId", async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const nodeId = parseInt(req.params.nodeId);

    try {
      // Fetch node info from Pterodactyl
      const nodeResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes/${nodeId}?include=servers`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            Accept: "application/json",
          },
        }
      );

      if (!nodeResponse.ok) {
        return res.status(404).json({ error: "Node not found" });
      }

      const nodeData = await nodeResponse.json();
      const currentServers = nodeData.relationships?.servers?.data?.length || 0;

      // Get node limit
      const nodeLimit = await db.get(`node-limit-${nodeId}`);
      const limit = nodeLimit ? nodeLimit.limit : 0;

      const available = limit === 0 || currentServers < limit;

      return res.json({
        nodeId,
        name: nodeData.attributes.name,
        currentServers,
        limit,
        available,
        remainingSlots: limit > 0 ? Math.max(0, limit - currentServers) : -1,
      });
    } catch (err) {
      console.error("Error checking node capacity:", err);
      return res.status(500).json({ error: "Failed to check node" });
    }
  });
};
