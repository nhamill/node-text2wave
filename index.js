var spawn = require('child_process').spawn;
var TextToWave = function(text, options, callback) {
	options = options || [];
	var child = spawn("text2wave" , options);
	child.stdin.write(text);
	child.stdin.end();

	child.on('error', function() {
		console.log('uh oh');
	});

	var stdout_buffers = [],
		stderr_buffers = [];
	child.stdout.on('data', function(chunk){
		stdout_buffers.push(chunk);
	});

	child.stderr.on('data', function(chunk) {
		stderr_buffers.push(chunk);
	});


	/**
	 * some versions of text2wave use an fseek at the end to overwrite the RIFF
	 * header; if that's the case, then mimic the seek
	 *
	 **/
	child.stdout.on('end', function(){
		var err = null;
		if (stdout_buffers.length > 0) {
			var src_buffer = stdout_buffers[stdout_buffers.length - 1];
			var dest_buffer = stdout_buffers[0];
			//sometimes the last buffer is more than 44 bytes; in that case break
			//it up to isolate the riff header
			var riff_hdr_len = 44;
			if (src_buffer.length > riff_hdr_len) {
				var new_buffer1 = new Buffer(src_buffer.length - riff_hdr_len);
				src_buffer.copy(new_buffer1, 0, 0, src_buffer.length - riff_hdr_len);
				var new_buffer2 = new Buffer(riff_hdr_len);
				src_buffer.copy(new_buffer2, 0, src_buffer.length - riff_hdr_len);
				stdout_buffers.splice(stdout_buffers.length - 1, 1);
				stdout_buffers.push(new_buffer1);
				stdout_buffers.push(new_buffer2);
				src_buffer = new_buffer2;
			}
			if ('RIFF' == src_buffer.toString('utf8', 0, 4)) {
				src_buffer.copy(dest_buffer, 0, 0);
				stdout_buffers[stdout_buffers.length - 1] = dest_buffer;
				stdout_buffers.splice(stdout_buffers.length - 1, 1);
			}
		}
		if (stderr_buffers.length > 0) {
			err = stderr_buffers.toString();
		}
		callback(err, Buffer.concat(stdout_buffers));
	});
};

module.exports = TextToWave;
