/**
 * Config Service
 * Manage public and private configurations
 */

import { getCollection } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get public configuration for SDK
 */
export async function getPublicConfig(publicKey) {
  try {
    const configs = getCollection('configs');
    const config = await configs.findOne({ publicKey, active: true });
    
    if (!config) {
      return {
        success: false,
        error: 'Configuration not found'
      };
    }
    
    return {
      success: true,
      data: {
        publicKey: config.publicKey,
        gateway: config.gateway,
        supportedMethods: config.supportedMethods || ['upi', 'card', 'wallet'],
        currency: config.currency || 'INR',
        theme: config.theme || 'light',
        branding: {
          name: config.branding?.name || '',
          logo: config.branding?.logo || '',
          colors: config.branding?.colors || {}
        }
      }
    };
  } catch (error) {
    logger.error('Get public config error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create new configuration (admin only)
 */
export async function createConfig(data) {
  try {
    const configs = getCollection('configs');
    
    const config = {
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      gateway: data.gateway,
      gatewayConfig: data.gatewayConfig,
      supportedMethods: data.supportedMethods,
      currency: data.currency || 'INR',
      theme: data.theme || 'light',
      branding: data.branding || {},
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await configs.insertOne(config);
    
    logger.info(`Config created for: ${data.publicKey}`);
    
    return {
      success: true,
      data: {
        publicKey: config.publicKey,
        gateway: config.gateway
      }
    };
  } catch (error) {
    logger.error('Create config error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getPublicConfig,
  createConfig
};
