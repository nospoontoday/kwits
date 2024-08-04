import jwt from 'jsonwebtoken';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import User from '../models/user.model.js';  // Import the User model

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify environment variable is set
const publicKeyPath = process.env.PUBLIC_KEY_PATH || "../../oauth-public.key";
if (!publicKeyPath) {
  throw new Error('PUBLIC_KEY_PATH environment variable is not set');
}

// Resolve and read the public key
const publicKey = fs.readFileSync(resolve(__dirname, publicKeyPath));

// Log the resolved path (for debugging)
console.log('Public Key Path:', resolve(__dirname, publicKeyPath));

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token provided

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, async (err, decoded) => {
    if (err) return res.sendStatus(403); // Invalid token

    // Extract user information from the decoded token
    const userId = decoded.sub; // User ID from 'sub' field

    try {
      // Find or create user
      let user = await User.findOne({ id: userId });
      if (!user) {
        user = new User({
          id: userId,
          status: 'active' // Default status or based on your logic
        });
        await user.save();
      }
      req.user = user; // Attach the user to the request object
      next();
    } catch (err) {
      console.error('Error finding or creating user:', err);
      res.sendStatus(500); // Internal Server Error
    }
  });
};

export default authenticateToken;
