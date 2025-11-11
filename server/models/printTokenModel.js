import mongoose from 'mongoose';
import crypto from 'crypto';

const printTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: track shop/device info
  shopId: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  // For idempotency: allow ONE successful response even if token marked used
  responseDelivered: {
    type: Boolean,
    default: false,
  },
});

// Auto-delete expired tokens after 1 hour
printTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// Static method to generate a secure token
printTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to create a new print token
printTokenSchema.statics.createPrintToken = async function(fileId, validityMinutes = 60, shopId = null) {
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);
  
  const printToken = new this({
    token,
    fileId,
    expiresAt,
    shopId,
  });
  
  await printToken.save();
  return printToken;
};

// Instance method to validate and mark as used
printTokenSchema.methods.validateAndUse = async function(requestInfo = {}) {
  const now = new Date();
  
  // Check if expired
  if (this.expiresAt < now) {
    throw new Error('TOKEN_EXPIRED');
  }
  
  // Check if already used AND response already delivered
  if (this.used && this.responseDelivered) {
    throw new Error('TOKEN_ALREADY_USED');
  }
  
  // Mark as used (but allow response delivery if not yet delivered)
  this.used = true;
  this.usedAt = now;
  
  // Track request info
  if (requestInfo.ipAddress) this.ipAddress = requestInfo.ipAddress;
  if (requestInfo.userAgent) this.userAgent = requestInfo.userAgent;
  
  await this.save();
  return true;
};

// Mark response as delivered (prevents reuse)
printTokenSchema.methods.markResponseDelivered = async function() {
  this.responseDelivered = true;
  await this.save();
};

const PrintTokenModel = mongoose.model('PrintToken', printTokenSchema);

export default PrintTokenModel;
