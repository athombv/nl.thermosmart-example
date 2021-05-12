'use strict';

const { OAuth2Device } = require('homey-oauth2app');
const ThermoSmartOAuth2Token = require('../../lib/ThermoSmartOAuth2Token');

const POLL_INTERVAL = 1000 * 60 * 5; // 5 min

module.exports = class ThermoSmartDevice extends OAuth2Device {

	onOAuth2Init() {
		const { id } = this.getData();
		this._id = id;

		this._sync = this._sync.bind(this);

		this.registerCapabilityListener('target_temperature', this._onCapabilityTargetTemperature.bind(this));

		this._sync();
		this._syncInterval = setInterval(this._sync, POLL_INTERVAL);
	}

	onOAuth2Migrate() {
		let access_token;

		const data = this.getData();
		const store = this.getStore();

		if (store.access_token) {
			access_token = store.access_token;
		} else if (data.access_token) {
			access_token = data.access_token;
		} else {
			throw new Error('Missing Access Token');
		}

		const token = new ThermoSmartOAuth2Token({
			access_token,
			token_type: 'Bearer',
		});
		const sessionId = data.id;
		const configId = this.driver.getOAuth2ConfigId();

		return {
			sessionId,
			configId,
			token,
		}
	}

	async onOAuth2MigrateSuccess() {
		await this.unsetStoreValue('token');
	}

	async onOAuth2Added() {
		await this.driver.ready();
		this.driver.registerWebhook();
	}

	async onOAuth2Deleted() {
		await this.driver.ready();
		this.driver.registerWebhook();
	}

	/*
		Thermostat methods
	*/
	async getThermostat() {
		return this.oAuth2Client.getThermostat({
			thermostatId: this._id,
		});
	}

	async setThermostat(data) {
		return this.oAuth2Client.setThermostat({
			thermostatId: this._id,
			data,
		});
	}

	async setThermostatPause(paused) {
		return this.oAuth2Client.setThermostatPause({
			thermostatId: this._id,
			paused,
		});
	}

	/*
		Capabilities
	*/
	_onCapabilityTargetTemperature(target_temperature) {
		return this.setThermostat({
			target_temperature,
		});
	}

	_sync() {
		this.getThermostat()
			.then(res => {
				this.setAvailable();
				this.setCapabilityValue('target_temperature', res.target_temperature);
				this.setCapabilityValue('measure_temperature', res.room_temperature);
			})
			.catch(err => {
				this.error(err);
				this.setUnavailable(err);
			})
	}

}