let token = '';
let tuid = '';

const verboseLogging = true;

function verboseLog(message) {
	if (verboseLogging) console.log(message);
	twitch.rig.log(message);
}

const twitch = window.Twitch.ext;

// create the request options for our Twitch API calls
const requests = {
	set: createRequest('POST', 'cycle'),
	get: createRequest('GET', 'query'),
};

function createRequest(type, method) {
	verboseLog('location: ' + location);
	let url = location.protocol + '//localhost:8081/color/' + method;
	url = 'https://localhost:8081/color/' + method;
	return {
		type: type,
		url,
		success: updateBlock,
		error: logError,
	};
}

function setAuth(token) {
	Object.keys(requests).forEach(req => {
		verboseLog('Setting auth headers');
		verboseLog("'Authorization': 'Bearer ' " + token);
		requests[req].headers = { 'Authorization': 'Bearer ' + token };
	});
}

twitch.onContext(function (context) {
	verboseLog(context);
});

twitch.onAuthorized(function (auth) {
	// save our credentials
	token = auth.token;
	tuid = auth.userId;

	// enable the button
	$('#cycle').removeAttr('disabled');

	setAuth(token);
	$.ajax(requests.get);
});

function updateBlock(hex) {
	verboseLog('Updating block color');
	$('#color').css('background-color', hex);
}

function logError(_, error, status) {
	verboseLog(
		'EBS request returned : [' + typeof _ + '] ' + status + ' (' + error + ')'
	);
}

function logSuccess(hex, status) {
	verboseLog('EBS request returned success: ' + hex + ' (' + status + ')');
}

$(function () {
	// when we click the cycle button
	$('#cycle').click(function () {
		if (!token) return verboseLog('Not authorized');

		verboseLog('Requesting a color cycle from ' + location.protocol);
		$.ajax(requests.set);
	});

	// when we click the cycle button
	$('#query').click(function () {
		if (!token) return verboseLog('Not authorized');

		verboseLog('Requesting current color from ' + location.protocol);
		$.ajax(requests.get);
	});
});
