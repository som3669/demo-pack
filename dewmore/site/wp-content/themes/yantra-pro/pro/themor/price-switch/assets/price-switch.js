/**
 * Price switch: a click on one of a switch's choices picks it for the whole page (the root
 * element's `data-themor-switch`), so the blocks set to show with the other choice hide (the
 * rules PriceSwitch::rules() prints), and every switch on the page shows the choice pressed.
 */
( function () {
	document.addEventListener( 'click', function ( event ) {
		var choice = event.target && event.target.closest ? event.target.closest( '.themor-price-switch__choice' ) : null;
		if ( ! choice ) {
			return;
		}
		var value = 'second' === choice.getAttribute( 'data-themor-switch' ) ? 'second' : 'first';
		document.documentElement.setAttribute( 'data-themor-switch', value );
		document.querySelectorAll( '.themor-price-switch__choice' ).forEach( function ( other ) {
			other.setAttribute( 'aria-pressed', other.getAttribute( 'data-themor-switch' ) === value ? 'true' : 'false' );
		} );
	} );
}() );
