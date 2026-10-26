/**
 * Countdown: each block (its `data-themor-timer`, Countdown::render()) ticks down to its end, a
 * time stamp the page printed, so a page a cache keeps still counts to the right moment. A
 * repeating one moves on to its next end by itself, a day or a week later at the same time of
 * day, even when the site's clocks change between (the site's time zone by name, through Intl);
 * a one-off shows its words once it ends, or hides. Screen readers read the time left in words,
 * changed at most once a minute; the ticking digits are hidden from them.
 *
 * One timer ticks every block of the page, on the second. Blocks that come in later (a popup's
 * content loaded when it opens) start as they arrive.
 */
( function () {
	var SELECTOR = '.wp-block-themor-countdown[data-themor-timer]';
	var DAY = 86400;
	var running = [];
	var timer = 0;
	var lang = document.documentElement.lang || undefined;
	var formats = {};
	var zones = {};

	/**
	 * A number with two digits.
	 *
	 * @param {number} number Number.
	 * @return {string} The number, a 0 in front of one digit.
	 */
	function pad( number ) {
		return ( number < 10 ? '0' : '' ) + number;
	}

	/**
	 * The time left as the chip shows it: hours, minutes and seconds, with the days in front
	 * when a day or more is left ("2d 08:14:22"), as Countdown::clock() writes it.
	 *
	 * @param {number} seconds Seconds left.
	 * @param {Object} data    The block's data: `days`, how the days go in front.
	 * @return {string} The time left.
	 */
	function digits( seconds, data ) {
		var clock = pad( Math.floor( ( seconds % DAY ) / 3600 ) ) + ':' + pad( Math.floor( ( seconds % 3600 ) / 60 ) ) + ':' + pad( seconds % 60 );
		var days = Math.floor( seconds / DAY );
		return days ? String( data.days || '{d}d {t}' ).replace( '{d}', String( days ) ).replace( '{t}', clock ) : clock;
	}

	/**
	 * The time left in words, to the minute ("8 hours, 14 minutes"), in the page's language, as
	 * Countdown::words() says it; under a minute, the block's `soon`.
	 *
	 * @param {number} seconds Seconds left.
	 * @param {Object} data    The block's data.
	 * @return {string|null} The words, or null when the browser can't say them.
	 */
	function words( seconds, data ) {
		if ( seconds < 60 ) {
			return data.soon || '';
		}
		var units = [
			[ 'day', Math.floor( seconds / DAY ) ],
			[ 'hour', Math.floor( ( seconds % DAY ) / 3600 ) ],
			[ 'minute', Math.floor( ( seconds % 3600 ) / 60 ) ],
		];
		try {
			var parts = [];
			units.forEach( function ( unit ) {
				if ( unit[ 1 ] ) {
					formats[ unit[ 0 ] ] = formats[ unit[ 0 ] ] || new Intl.NumberFormat( lang, { style: 'unit', unit: unit[ 0 ], unitDisplay: 'long' } );
					parts.push( formats[ unit[ 0 ] ].format( unit[ 1 ] ) );
				}
			} );
			if ( undefined === formats.list ) {
				formats.list = Intl.ListFormat ? new Intl.ListFormat( lang, { style: 'long', type: 'unit' } ) : null;
			}
			return formats.list ? formats.list.format( parts ) : parts.join( ', ' );
		} catch ( error ) {
			// Words the page printed stay.
			return null;
		}
	}

	/**
	 * How far a time zone's clock is ahead of UTC at a moment, in seconds; 0 for none (a site on
	 * a fixed offset, whose clocks never change, or a zone the browser doesn't know).
	 *
	 * @param {number} time Moment, in milliseconds.
	 * @param {string} zone Time zone's name, such as America/New_York.
	 * @return {number} Seconds.
	 */
	function offsetAt( time, zone ) {
		if ( ! zone ) {
			return 0;
		}
		try {
			zones[ zone ] =
				zones[ zone ] ||
				new Intl.DateTimeFormat( 'en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' } );
			var parts = {};
			zones[ zone ].formatToParts( new Date( time ) ).forEach( function ( part ) {
				parts[ part.type ] = part.value;
			} );
			var wall = Date.UTC( Number( parts.year ), Number( parts.month ) - 1, Number( parts.day ), Number( parts.hour ) % 24, Number( parts.minute ), Number( parts.second ) );
			return Math.round( ( wall - Math.floor( time / 1000 ) * 1000 ) / 60000 ) * 60;
		} catch ( error ) {
			return 0;
		}
	}

	/**
	 * A repeating block's next end after a moment: its first end, a whole number of days or weeks
	 * later, moved by the change of the site's clocks between them, so it keeps its time of day.
	 *
	 * @param {Object} state The block's state.
	 * @param {number} now   Moment, in milliseconds.
	 * @return {number} The next end, in milliseconds.
	 */
	function next( state, now ) {
		var first = state.data.end * 1000;
		var every = state.data.every * 1000;
		// From the last whole step before now: moved an hour later when the clocks went back, it
		// may still be ahead; moved earlier when they went forward, a step more may be needed.
		var steps = Math.max( 1, Math.floor( ( now - first ) / every ) );
		var at = 0;
		for ( var tries = 0; tries < 4; tries++, steps++ ) {
			at = first + steps * every;
			at += ( offsetAt( first, state.data.zone ) - offsetAt( at, state.data.zone ) ) * 1000;
			if ( at > now ) {
				break;
			}
		}
		return at;
	}

	/**
	 * A one-off block once its end has passed: hidden, or its words in place of the time, which
	 * screen readers read as they are.
	 *
	 * @param {Object} state The block's state.
	 */
	function finish( state ) {
		var block = state.block;
		state.done = true;
		if ( state.data.hide ) {
			block.hidden = true;
			return;
		}
		var chip = block.querySelector( '.themor-countdown' );
		var ended = document.createElement( 'time' );
		ended.className = 'themor-countdown__ended';
		ended.setAttribute( 'datetime', state.time.getAttribute( 'datetime' ) || '' );
		ended.textContent = state.data.ended || '';
		Array.prototype.forEach.call( block.querySelectorAll( '.themor-countdown__label, .themor-countdown__time, .themor-countdown__spoken' ), function ( part ) {
			part.parentNode.removeChild( part );
		} );
		if ( chip ) {
			chip.removeAttribute( 'aria-hidden' );
			chip.appendChild( ended );
		}
		block.classList.add( 'is-ended' );
	}

	/**
	 * A block at a moment: its time left, and the words for screen readers when they change; a
	 * repeating one past its end moves on to the next, a one-off finishes.
	 *
	 * @param {Object} state The block's state.
	 * @param {number} now   Moment, in milliseconds.
	 */
	function update( state, now ) {
		if ( state.end <= now ) {
			if ( ! state.data.every ) {
				finish( state );
				return;
			}
			state.end = next( state, now );
			state.time.setAttribute( 'datetime', new Date( state.end ).toISOString().replace( /\.\d+Z$/, 'Z' ) );
		}
		// Whole seconds left: 00:00:00 for the last one, then the end.
		var left = Math.floor( ( state.end - now ) / 1000 );
		var shown = digits( left, state.data );
		// The digits' own text node, so nothing watching the page's elements hears of each tick.
		if ( state.digits.data !== shown ) {
			state.digits.data = shown;
		}
		var said = words( left, state.data );
		if ( null !== said && state.spoken ) {
			var text = String( state.data.said || '{left}' ).replace( '{left}', said );
			if ( state.spoken.textContent !== text ) {
				state.spoken.textContent = text;
			}
		}
	}

	/**
	 * Tick every running block, then wait for the next second.
	 */
	function tick() {
		timer = 0;
		var now = Date.now();
		running = running.filter( function ( state ) {
			return ! state.done && state.block.isConnected;
		} );
		running.forEach( function ( state ) {
			update( state, now );
		} );
		schedule();
	}

	/**
	 * The next tick, just after the next second begins (every end is on a second).
	 */
	function schedule() {
		if ( ! timer && running.length ) {
			timer = window.setTimeout( tick, 1020 - ( Date.now() % 1000 ) );
		}
	}

	/**
	 * Start a block: read its data, then tick it with the others. A block started before that
	 * left the page and came back ticks again.
	 *
	 * @param {HTMLElement} block The block.
	 */
	function start( block ) {
		var state = block.themorTimer;
		if ( ! state ) {
			var data = null;
			try {
				data = JSON.parse( block.getAttribute( 'data-themor-timer' ) );
			} catch ( error ) {}
			var time = block.querySelector( '.themor-countdown__time' );
			if ( ! data || ! data.end || ! time ) {
				return;
			}
			if ( ! time.firstChild || 3 !== time.firstChild.nodeType ) {
				time.insertBefore( document.createTextNode( '' ), time.firstChild );
			}
			state = block.themorTimer = {
				block: block,
				data: data,
				end: data.end * 1000,
				time: time,
				digits: time.firstChild,
				spoken: block.querySelector( '.themor-countdown__spoken' ),
				done: false,
			};
		}
		if ( state.done || -1 !== running.indexOf( state ) ) {
			return;
		}
		running.push( state );
		update( state, Date.now() );
		schedule();
	}

	/**
	 * Start the blocks in a part of the page, itself included.
	 *
	 * @param {Element|Document} root Where to look.
	 */
	function scan( root ) {
		if ( root.matches && root.matches( SELECTOR ) ) {
			start( root );
		}
		if ( root.querySelectorAll ) {
			Array.prototype.forEach.call( root.querySelectorAll( SELECTOR ), start );
		}
	}

	scan( document );

	// Blocks that come in later: a popup's content loaded when it opens, or any other.
	if ( 'MutationObserver' in window ) {
		new window.MutationObserver( function ( records ) {
			records.forEach( function ( record ) {
				Array.prototype.forEach.call( record.addedNodes, function ( node ) {
					if ( 1 === node.nodeType ) {
						scan( node );
					}
				} );
			} );
		} ).observe( document.documentElement, { childList: true, subtree: true } );
	}

	// Back on a tab the browser slowed down, the time is right at once.
	document.addEventListener( 'visibilitychange', function () {
		if ( ! document.hidden ) {
			window.clearTimeout( timer );
			tick();
		}
	} );
}() );
