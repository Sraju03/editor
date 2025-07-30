const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    // Extract path and construct base URL
    const path = event.path.replace("http://localhost:8000", "");
    const backendUrl = `http://144.126.253.174:8001${path}`;

    // Create URL object to handle query parameters
    const url = new URL(backendUrl);
    if (event.queryStringParameters) {
      Object.keys(event.queryStringParameters).forEach((key) => {
        url.searchParams.append(key, event.queryStringParameters[key]);
      });
    }

    console.log("Forwarded URL:", url.toString()); // Log for debugging

    // Clone headers and remove problematic ones
    const headers = { ...event.headers };
    delete headers.host; // Let fetch set the correct host
    delete headers["content-length"]; // Let fetch calculate
    delete headers["transfer-encoding"];

    // Determine if body should be sent
    const hasBody = !["GET", "HEAD"].includes(event.httpMethod.toUpperCase());

    // If body is base64 encoded, decode it before forwarding
    const body = hasBody
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body
      : undefined;

    const res = await fetch(url, {
      method: event.httpMethod,
      headers,
      body,
    });

    // Get content type
    const contentType = res.headers.get("content-type") || "application/json";

    // Handle binary vs text response based on content-type
    let responseBody;
    if (
      contentType.includes("application/json") ||
      contentType.includes("text/")
    ) {
      responseBody = await res.text();
    } else {
      // For images, videos, or other binaries, return base64 encoded string
      const buffer = await res.buffer();
      responseBody = buffer.toString("base64");
    }

    return {
      statusCode: res.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "https://fignos.netlify.app",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: responseBody,
      isBase64Encoded:
        !contentType.includes("application/json") &&
        !contentType.includes("text/"),
    };
  } catch (err) {
    console.error("Proxy error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Proxy error",
        details: err.message,
      }),
    };
  }
};
