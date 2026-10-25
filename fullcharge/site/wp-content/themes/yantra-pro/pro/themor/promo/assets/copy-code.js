/**
 * Copy code: each block's button (hidden until this shows it) copies its code: through the
 * Clipboard API, else with the code selected and copied the older way. Copied, the button says
 * so with a tick for 3 seconds, and the block's live region says it too. When neither way works,
 * the code is left selected and the live region, shown under the code, says how to copy it
 * (Ctrl+C, or ⌘C on a Mac). Blocks that come in later (a popup's content loaded when it opens)
 * get their button as they arrive.
 */
( function () {
	var SELECTOR = '.wp-block-themor-copy-code[data-themor-copy-code]';
	var DONE = 3000;
	var count = 0;
	var agent = navigator.userAgentData && navigator.userAgentData.platform ? navigator.userAgentData.platform : navigator.platform || '';
	var mac = /mac|iphone|ipad|ipod/i.test( agent );

	/**
	 * Start a block: read its words, tie the button to the code for screen readers ("Copy code,
	 * HELLO10") and show the button.
	 *
	 * @param {HTMLElement} block The block.
	 * @return {Object|null} The block's state, or null when it has no code or button.
	 */
	function start( block ) {
		if ( block.themorCopyCode ) {
			return block.themorCopyCode;
		}
		var code = block.querySelector( '.themor-copy-code__code' );
		var button = block.querySelector( '.themor-copy-code__button' );
		var words = button ? button.querySelector( '.themor-copy-code__words' ) : null;
		if ( ! code || ! button || ! words ) {
			return null;
		}
		var data = {};
		try {
			data = JSON.parse( block.getAttribute( 'data-themor-copy-code' ) ) || {};
		} catch ( error ) {}
		// An ID of its own, even beside a block a popup's content brought in with the same.
		if ( ! code.id ) {
			do {
				code.id = 'themor-copy-code-' + ++count;
			} while ( document.querySelectorAll( '#' + code.id ).length > 1 );
		}
		button.setAttribute( 'aria-describedby', code.id );
		button.hidden = false;
		block.themorCopyCode = {
			data: data,
			code: code,
			button: button,
			words: words,
			label: words.textContent,
			status: block.querySelector( '.themor-copy-code__status' ),
			timer: 0,
		};
		return block.themorCopyCode;
	}

	/**
	 * Say something through the block's live region: emptied first, so the same words said again
	 * are heard again.
	 *
	 * @param {Object}  state The block's state.
	 * @param {string}  words What to say.
	 * @param {boolean} shown Whether it shows under the code too.
	 */
	function say( state, words, shown ) {
		if ( ! state.status ) {
			return;
		}
		state.status.textContent = '';
		state.status.classList.toggle( 'is-shown', shown );
		window.setTimeout( function () {
			state.status.textContent = words;
		}, 100 );
	}

	/**
	 * The code selected, for copying by hand.
	 *
	 * @param {Object} state The block's state.
	 */
	function select( state ) {
		var selection = state.code.ownerDocument.defaultView.getSelection();
		var range = state.code.ownerDocument.createRange();
		range.selectNodeContents( state.code );
		selection.removeAllRanges();
		selection.addRange( range );
	}

	/**
	 * Copied: the button says so with its tick for a while, and the live region says it.
	 *
	 * @param {Object} state The block's state.
	 */
	function copied( state ) {
		var words = state.data.copied || state.label;
		state.button.classList.add( 'is-copied' );
		state.words.textContent = words;
		say( state, words, false );
		window.clearTimeout( state.timer );
		state.timer = window.setTimeout( function () {
			state.button.classList.remove( 'is-copied' );
			state.words.textContent = state.label;
			if ( state.status ) {
				state.status.textContent = '';
			}
		}, DONE );
	}

	/**
	 * Copy the old way: the code selected, then the browser's copy command. When that fails too,
	 * the code stays selected and the block says how to copy it.
	 *
	 * @param {Object} state The block's state.
	 */
	function fallback( state ) {
		var done = false;
		select( state );
		try {
			done = document.execCommand( 'copy' );
		} catch ( error ) {}
		if ( done ) {
			state.code.ownerDocument.defaultView.getSelection().removeAllRanges();
			copied( state );
			return;
		}
		say( state, ( mac ? state.data.mac : state.data.keys ) || '', true );
	}

	/**
	 * Copy a block's code.
	 *
	 * @param {Object} state The block's state.
	 */
	function copy( state ) {
		var text = state.code.textContent;
		if ( navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext ) {
			navigator.clipboard.writeText( text ).then(
				function () {
					copied( state );
				},
				function () {
					fallback( state );
				}
			);
			return;
		}
		fallback( state );
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

	document.addEventListener( 'click', function ( event ) {
		var button = event.target && event.target.closest ? event.target.closest( '.themor-copy-code__button' ) : null;
		var block = button ? button.closest( SELECTOR ) : null;
		var state = block ? start( block ) : null;
		if ( state && state.button === button ) {
			copy( state );
		}
	} );

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
}() );
