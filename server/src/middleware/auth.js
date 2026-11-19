import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Verifies the Bearer JWT, loads the user, and sets req.user = { id, name, email }.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised, no token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('name email');
    if (!user) {
      return res.status(401).json({ message: 'Not authorised, user not found' });
    }
    req.user = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch (err) {
    next(err); // JWT errors are caught by the error middleware → 401
  }
};

export default protect;
