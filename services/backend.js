const fs = require('fs');
const path = require('path');
const Boom = require('boom');
const color = require('color');
const ext = require('commander');
const jsonwebtoken = require('jsonwebtoken');

const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');

// The developer rig uses self-signed certificates.  Node doesn't accept them
// by default.  Do not use this in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use verbose logging during development.  Set this to false for production.
const verboseLogging = true;
const verboseLog = verboseLogging ? console.log.bind(console) : () => {};

// Service state variables
const initialColor = color('#6441A4'); // set initial color; bleedPurple
const bearerPrefix = 'Bearer '; // HTTP authorization headers have this prefix
const colorWheelRotation = 30;
const channelColors = {};

const STRINGS = {
	secretEnv: usingValue('secret'),
	clientIdEnv: usingValue('client-id'),
	serverStarted: 'Server running at %s',
	secretMissing: missingValue('secret', 'EXT_SECRET'),
	clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
	cyclingColor: 'Cycling color for c:%s on behalf of u:%s',
	sendColor: 'Sending color %s to c:%s',
	invalidAuthHeader: 'Invalid authorization header',
	invalidJwt: 'Invalid JWT',
};

ext
	.version(require('../package.json').version)
	.option('-s, --secret <secret>', 'Extension secret')
	.option('-c, --client-id <client_id>', 'Extension client ID')
	.parse(process.argv);

const secret = Buffer.from(getOption('secret', 'ENV_SECRET'), 'base64');
const clientId = getOption('clientId', 'ENV_CLIENT_ID');

const app = express();
let server;

const serverOptions = {
	host: 'localhost',
	port: 8081,
};
const serverPathRoot = path.resolve(__dirname, '..', 'conf', 'server');
verboseLog('root: ' + serverPathRoot);

if (
	fs.existsSync(serverPathRoot + '.crt') &&
	fs.existsSync(serverPathRoot + '.key')
) {
	verboseLog('certificate detected');
	serverOptions.tls = {
		// If you need a certificate, execute "npm run cert".
		cert: fs.readFileSync(serverPathRoot + '.crt'),
		key: fs.readFileSync(serverPathRoot + '.key'),
	};
	server = https.createServer(serverOptions.tls, app);
} else server = http.createServer(app);
server.listen(serverOptions.port, serverOptions.host, data =>
	console.log(STRINGS.serverStarted, 'https://localhost:8081')
);

app.use(cors());

app.post('/color/cycle', colorCycleHandler);
app.get('/color/query', colorQueryHandler);
app.post('/color/cycle1', function (req, res) {
	res.send('I did something!');
});

function usingValue(name) {
	return `Using environment variable for ${name}`;
}

function missingValue(name, variable) {
	const option = name.charAt(0);
	return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}

// Get options from the command line or the environment.
function getOption(optionName, environmentName) {
	const option = (() => {
		if (ext[optionName]) {
			return ext[optionName];
		} else if (process.env[environmentName]) {
			console.log(STRINGS[optionName + 'Env']);
			return process.env[environmentName];
		}
		console.log(STRINGS[optionName + 'Missing']);
		process.exit(1);
	})();
	console.log(`Using "${option}" for ${optionName}`);
	return option;
}

// Verify the header and the enclosed JWT.
function verifyAndDecode(header) {
	if (header.startsWith(bearerPrefix)) {
		try {
			const token = header.substring(bearerPrefix.length);
			return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
		} catch (ex) {
			throw Boom.unauthorized(STRINGS.invalidJwt);
		}
	}
	throw Boom.unauthorized(STRINGS.invalidAuthHeader);
}

function colorCycleHandler(req, res) {
	verboseLog('clycle ocolor');
	// Verify all requests.
	const payload = verifyAndDecode(req.headers.authorization);
	const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
	verboseLog(payload);

	// Store the color for the channel.
	let currentColor = channelColors[channelId] || initialColor;

	// Rotate the color as if on a color wheel.
	verboseLog(STRINGS.cyclingColor, channelId, opaqueUserId);
	currentColor = color(currentColor).rotate(colorWheelRotation).hex();

	// Save the new color for the channel.
	channelColors[channelId] = currentColor;

	verboseLog('cylce Color');

	// return currentColor;
	res.send(currentColor);
}

function colorQueryHandler(req, res) {
	// Verify all requests.
	const payload = verifyAndDecode(req.headers.authorization);

	// Get the color for the channel from the payload and return it.
	const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
	const currentColor = color(channelColors[channelId] || initialColor).hex();
	verboseLog(STRINGS.sendColor, currentColor, opaqueUserId);

	// return currentColor;
	res.send(currentColor);
}
