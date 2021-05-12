'use strict';

const { OAuth2Client, fetch } = require('homey-oauth2app');

const ThermoSmartOAuth2Token = require('./ThermoSmartOAuth2Token');
module.exports = class ThermoSmartOAuth2Client extends OAuth2Client {

  static API_URL = 'https://api.thermosmart.com';
  static TOKEN_URL = 'https://api.thermosmart.com/oauth2/token';
  static TOKEN = ThermoSmartOAuth2Token;
  static AUTHORIZATION_URL = 'https://api.thermosmart.com/oauth2/authorize';

  async onGetTokenByCode({ code }) {
    const res = await fetch(this._tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code',
        client_id: this._clientId,
        client_secret: this._clientSecret,
        redirect_uri: this._redirectUrl,
      }),
    });

    const {
      token_type,
      access_token,
      thermostat,
    } = await res.json();

    const token = new this._tokenConstructor({
      token_type,
      access_token,
      thermostatId: thermostat,
    });
    return token;
  }

  async getThermostat({ thermostatId }) {
    return this.get({
      path: `/thermostat/${thermostatId}`,
    });
  }

  async setThermostat({ thermostatId, data }) {
    return this.put({
      path: `/thermostat/${thermostatId}`,
      json: data,
    });
  }

  async setThermostatPause({ thermostatId, paused }) {
    return this.post({
      path: `/thermostat/${thermostatId}/pause`,
      json: {
        pause: !!paused,
      },
    });
  }

}