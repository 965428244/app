/**
 * Detect Chrome extension
 */
'use strict';

var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var launcher = require('browser-launcher2');
var utils = require('../node-utils');
var debug = require('debug')('lsapp:detect-chrome');
var identify = require('./identify');

var extensionPaths = {
	win32: [
		'~\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions',
		'~\\AppData\\Local\\Chromium\\User Data\\Default\\Extensions'
	],
	darwin: [
		'~/Library/Application Support/Google/Chrome/Default/Extensions',
		'~/Library/Application Support/Chromium/Default/Extensions'
	],
	linux: [
		'~/.config/google-chrome/Default/Extensions',
		'~/.config/chromium/Default/Extensions'
	]
};

var extensionId = ['obipchajaiohjoohongibhgbfgchblei', 'diebikgmpmeppiilkaijjbdgciafajmg'];

/**
 * Returns a promise that fulfilled if user has installed Chrome extension
 * @param {LivestyleClient} client A LiveStyle WebSocket client
 * @return {Promise}
 */
module.exports = function(client) {
	debug('detecting Chrome browser extension');
	return identify(client, 'chrome')
	.then(null, detectChrome)
	.then(detectInstalledExtension);
};

function detectChrome() {
	return new Promise(function(resolve, reject) {
		launcher.detect(function(browsers) {
			debug('browser found: %d', browsers.length);
			var hasChrome = browsers.some(function(browser) {
				return browser.type === 'chrome';
			});
			debug('has Chrome installed? %o', hasChrome);
			if (hasChrome) {
				resolve();
			} else {
				var err = new Error('No Chrome browser installed');
				err.code = 'EDETECTNOCHROME';
				reject(err);
			}
		});
	});
}

function detectInstalledExtension() {
	return utils.pathContents(extensionPaths[process.platform])
	.then(function(found) {
		var extPath = null;
		found.some(function(obj) {
			return obj.items.some(function(item) {
				if (extensionId.indexOf(item) !== -1) {
					return extPath = path.join(obj.path, item);
				}
			});
		});
		
		if (!extPath) {
			var err = new Error('No installed LiveStyle Chrome extension');
			err.code = 'EDETECTNOCHROMEEXT';
			throw err;
		}

		return extPath;
	});
}

if (require.main === module) {
	let pkg = require('../../package.json');
	require('../client')(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return console.error(err);
		}

		console.log('RV client connected');
		module.exports(client).then(function() {
			console.log('Chrome extension is installed');
			client.destroy();
		}, function() {
			console.log('Chrome extension is NOT installed');
			client.destroy();
		});
	});
}