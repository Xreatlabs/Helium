/**
 * Bun-compatible server entry point for Helium
 * This wraps the Express app to work with Bun.serve()
 */

// Import the main app
const appModule = require('./app.js');

// Get the Express app from the module
const app = appModule.app;

// Create a Bun-compatible fetch handler
const fetchHandler = async (request) => {
  // Convert Bun Request to Node.js-compatible request
  const url = new URL(request.url);
  
  // Create a mock request object that Express can understand
  const mockReq = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    query: Object.fromEntries(url.searchParams),
    _parsedUrl: {
      pathname: url.pathname,
      search: url.search,
      query: Object.fromEntries(url.searchParams)
    },
    connection: {
      remoteAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    },
    session: {},
    headers: request.headers
  };

  // Create a mock response object
  let responseBody = '';
  let statusCode = 200;
  let responseHeaders = {};

  const mockRes = {
    status: (code) => {
      statusCode = code;
      return mockRes;
    },
    send: (body) => {
      responseBody = body;
      return mockRes;
    },
    json: (obj) => {
      responseBody = JSON.stringify(obj);
      responseHeaders['Content-Type'] = 'application/json';
      return mockRes;
    },
    redirect: (url) => {
      statusCode = 302;
      responseHeaders['Location'] = url;
      return mockRes;
    },
    setHeader: (name, value) => {
      responseHeaders[name] = value;
      return mockRes;
    },
    getHeader: (name) => responseHeaders[name],
    render: (template, data, callback) => {
      // Handle EJS rendering
      const ejs = require('ejs');
      ejs.renderFile(template, data, null, (err, str) => {
        if (err) {
          responseBody = 'Template rendering error: ' + err.message;
          statusCode = 500;
        } else {
          responseBody = str;
        }
      });
      return mockRes;
    },
    sendFile: (path) => {
      const fs = require('fs');
      try {
        responseBody = fs.readFileSync(path, 'utf8');
      } catch (err) {
        responseBody = 'File not found';
        statusCode = 404;
      }
      return mockRes;
    }
  };

  // Handle the request through Express
  try {
    await new Promise((resolve, reject) => {
      app(mockReq, mockRes, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Express handler error:', error);
    responseBody = 'Internal Server Error';
    statusCode = 500;
  }

  // Return Bun-compatible Response
  return new Response(responseBody, {
    status: statusCode,
    headers: responseHeaders
  });
};

// Export the fetch handler for Bun.serve()
module.exports = {
  fetch: fetchHandler
};
