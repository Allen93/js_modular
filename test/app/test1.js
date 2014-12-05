define('app/test1', ['./test2'], function (test2) {
	console.log('test1.js')

	return ['test1', test2];
});