'use strict';

const { OAuth2App } = require('homey-oauth2app');

const ThermoSmartOAuth2Client = require('./lib/ThermoSmartOAuth2Client');

module.exports = class ThermoSmartApp extends OAuth2App {

	static OAUTH2_CLIENT = ThermoSmartOAuth2Client;
	static OAUTH2_DEBUG = true;

}