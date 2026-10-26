/**
 * Bundle builder (includes/Bundle.php): a block with more than one set becomes tabs (WAI-ARIA's:
 * a click, the arrow keys, Home and End pick a tab; the other sets are `hidden`). In each set, a
 * choice picked marks its card and takes its step's place in the summary, whose totals follow:
 * the steps' prices one by one, the saving (the form's `data-discount` per cent) and what they
 * come to together. The button adds the set without leaving the page (`window.themorBundle.ajax`),
 * answered with the cart's fragments as WooCommerce's own Add to cart is, then says so and tells
 * the page (`added_to_cart`), which opens the cart drawer. Without this script the form is sent as
 * a page and goes on to the cart.
 */
( function () {
	var data = window.themorBundle || {};
	var $ = window.jQuery;

	/**
	 * An amount as the store writes prices.
	 *
	 * @param {number} amount The amount.
	 * @return {string} The price.
	 */
	function money( amount ) {
		var format = data.money || {};
		var decimals = 'number' === typeof format.decimals ? format.decimals : 2;
		var parts = Number( amount ).toFixed( decimals ).split( '.' );
		var number = parts[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, format.thousands || '' ) + ( parts[ 1 ] ? ( format.decimal || '.' ) + parts[ 1 ] : '' );
		return String( format.format || '%1$s%2$s' ).replace( '%1$s', format.symbol || '' ).replace( '%2$s', number );
	}

	/**
	 * Say something through a set's live region: emptied first, so the same words are heard again.
	 *
	 * @param {HTMLFormElement} form The set's form.
	 * @param {string}          text What to say.
	 */
	function say( form, text ) {
		var status = form.querySelector( '[data-themor-bundle-status]' );
		if ( ! status ) {
			return;
		}
		status.textContent = '';
		window.setTimeout( function () {
			status.textContent = text || '';
		}, 100 );
	}

	/**
	 * A set's summary and its cards, from the choices picked.
	 *
	 * @param {HTMLFormElement} form The set's form.
	 */
	function update( form ) {
		var full = 0;
		Array.prototype.forEach.call( form.querySelectorAll( '.themor-bundle__radio' ), function ( radio ) {
			var card = radio.closest( '.themor-bundle__choice' );
			if ( card ) {
				card.classList.toggle( 'is-picked', radio.checked );
			}
			if ( ! radio.checked ) {
				return;
			}
			full += Number( radio.getAttribute( 'data-price' ) ) || 0;
			var step = ( /\[(\d+)\]/.exec( radio.name ) || [] )[ 1 ];
			var item = form.querySelector( '.themor-bundle__picked-item[data-step="' + step + '"]' );
			if ( ! item ) {
				return;
			}
			var name = item.querySelector( '.themor-bundle__picked-name' );
			var price = item.querySelector( '.themor-bundle__picked-price' );
			var image = item.querySelector( '.themor-bundle__picked-image' );
			var picture = card ? card.querySelector( '.themor-bundle__picture img' ) : null;
			if ( name ) {
				name.textContent = radio.getAttribute( 'data-name' ) || '';
			}
			if ( price ) {
				price.textContent = money( Number( radio.getAttribute( 'data-price' ) ) || 0 );
			}
			if ( image && picture ) {
				var copy = picture.cloneNode( false );
				copy.removeAttribute( 'srcset' );
				copy.removeAttribute( 'sizes' );
				copy.alt = '';
				image.replaceChildren( copy );
			}
		} );
		var discount = Number( form.getAttribute( 'data-discount' ) ) || 0;
		var decimals = 'number' === typeof ( data.money || {} ).decimals ? data.money.decimals : 2;
		var off = Number( ( ( full * discount ) / 100 ).toFixed( decimals ) );
		var fullText = form.querySelector( '[data-themor-bundle-full]' );
		var savingText = form.querySelector( '[data-themor-bundle-saving]' );
		var totalText = form.querySelector( '[data-themor-bundle-total]' );
		if ( fullText ) {
			fullText.textContent = money( full );
		}
		if ( savingText ) {
			savingText.textContent = '−' + money( off );
		}
		if ( totalText ) {
			totalText.textContent = money( full - off );
		}
	}

	/**
	 * Show one set of a block with tabs.
	 *
	 * @param {HTMLElement} block The block.
	 * @param {HTMLElement} tab   The tab picked.
	 * @param {boolean}     focus Whether to move the focus to it.
	 */
	function showTab( block, tab, focus ) {
		Array.prototype.forEach.call( block.querySelectorAll( '.themor-bundle__tab' ), function ( each ) {
			var on = each === tab;
			each.setAttribute( 'aria-selected', on ? 'true' : 'false' );
			each.tabIndex = on ? 0 : -1;
			var panel = document.getElementById( each.getAttribute( 'aria-controls' ) );
			if ( panel ) {
				panel.hidden = ! on;
			}
		} );
		if ( focus ) {
			tab.focus();
		}
	}

	/**
	 * A block set up once: its tabs, and each set's summary from the choices picked (a browser may
	 * have restored others).
	 *
	 * @param {HTMLElement} block The block.
	 */
	function start( block ) {
		if ( block.themorBundle ) {
			return;
		}
		block.themorBundle = true;
		if ( block.querySelector( '.themor-bundle__tab' ) ) {
			block.classList.add( 'is-tabbed' );
		}
		Array.prototype.forEach.call( block.querySelectorAll( '[data-themor-bundle-set]' ), update );
	}

	document.addEventListener( 'change', function ( event ) {
		var radio = event.target && event.target.closest ? event.target.closest( '.themor-bundle__radio' ) : null;
		var form = radio ? radio.closest( '[data-themor-bundle-set]' ) : null;
		if ( form ) {
			update( form );
		}
	} );

	document.addEventListener( 'click', function ( event ) {
		var tab = event.target && event.target.closest ? event.target.closest( '.themor-bundle__tab' ) : null;
		var block = tab ? tab.closest( '[data-themor-bundle]' ) : null;
		if ( block ) {
			showTab( block, tab, false );
		}
	} );

	document.addEventListener( 'keydown', function ( event ) {
		var tab = event.target && event.target.closest ? event.target.closest( '.themor-bundle__tab' ) : null;
		var block = tab ? tab.closest( '[data-themor-bundle]' ) : null;
		if ( ! block ) {
			return;
		}
		var tabs = Array.prototype.slice.call( block.querySelectorAll( '.themor-bundle__tab' ) );
		var at = tabs.indexOf( tab );
		var back = 'rtl' === window.getComputedStyle( block ).direction;
		var next = null;
		if ( 'ArrowRight' === event.key || 'ArrowLeft' === event.key ) {
			var step = ( 'ArrowRight' === event.key ) !== back ? 1 : -1;
			next = tabs[ ( at + step + tabs.length ) % tabs.length ];
		} else if ( 'Home' === event.key ) {
			next = tabs[ 0 ];
		} else if ( 'End' === event.key ) {
			next = tabs[ tabs.length - 1 ];
		}
		if ( next ) {
			event.preventDefault();
			showTab( block, next, true );
		}
	} );

	document.addEventListener( 'submit', function ( event ) {
		var form = event.target && event.target.closest ? event.target.closest( '[data-themor-bundle-set]' ) : null;
		if ( ! form || ! data.ajax || ! window.fetch || ! window.FormData ) {
			return;
		}
		event.preventDefault();
		var button = form.querySelector( '.themor-bundle__add' );
		if ( ! button || button.getAttribute( 'aria-busy' ) ) {
			return;
		}
		var body = new window.FormData( form );
		button.classList.add( 'loading' );
		button.setAttribute( 'aria-busy', 'true' );
		window
			.fetch( data.ajax, { method: 'POST', body: body, credentials: 'same-origin' } )
			.then( function ( response ) {
				return response.json();
			} )
			.then( function ( result ) {
				if ( ! result || result.error || ! result.fragments ) {
					throw new Error( 'not added' );
				}
				Object.keys( result.fragments ).forEach( function ( selector ) {
					document.querySelectorAll( selector ).forEach( function ( element ) {
						element.outerHTML = result.fragments[ selector ];
					} );
				} );
				button.classList.add( 'added' );
				say( form, data.added );
				if ( $ ) {
					$( document.body ).trigger( 'added_to_cart', [ result.fragments, result.cart_hash, $( button ) ] );
				}
			} )
			.catch( function () {
				say( form, data.error );
			} )
			.then( function () {
				button.classList.remove( 'loading' );
				button.removeAttribute( 'aria-busy' );
			} );
	} );

	function startAll() {
		Array.prototype.forEach.call( document.querySelectorAll( '[data-themor-bundle]' ), start );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', startAll );
	} else {
		startAll();
	}

	window.addEventListener( 'pageshow', function ( event ) {
		if ( event.persisted ) {
			Array.prototype.forEach.call( document.querySelectorAll( '[data-themor-bundle-set]' ), update );
		}
	} );
}() );
