class Scheduler {
	/**
	 * Starts a new scheduler
	 * @param {Number} startHour - the hour the task should first run
	 * @param {Number} startMinute - the minute the task should first run
	 * @param {Number} startSecond - the second the task should first run
	 * @param {Number} frequency - the frequency of task execution (in seconds)
	 * @param  {...function} callbacks - the function(s) that should be executed
	 */
	constructor(startHour, startMinute, startSecond, frequency, ...callbacks) {
		const now = new Date();
		
		now.setHours(startHour);
		now.setMinutes(startMinute);
		now.setSeconds(startSecond);

		const offset = now.getTime() - Date.now();

		this.timeoutId = setTimeout(() => {
			for (const cb of callbacks) {
				cb();
			}

			this.intervalId = setInterval(() => {
				for (const cb of callbacks) {
					cb();
				}
			}, frequency * 1000);
		}, offset);
	}

	stop() {
		if (this.intervalId)
			clearInterval(this.intervalId);
		else
			clearTimeout(this.timeoutId);
	}
}

module.exports = Scheduler;