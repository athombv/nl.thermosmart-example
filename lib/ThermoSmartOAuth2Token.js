'use strict';

const { OAuth2Token } = require('homey-oauth2app');

module.exports = class ThermoSmartOAuth2Token extends OAuth2Token {

  constructor({ thermostatId, ...props }) {
    super({ ...props });

    this.thermostatId = thermostatId || null;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      thermostatId: this.thermostatId,
    }
  }

}