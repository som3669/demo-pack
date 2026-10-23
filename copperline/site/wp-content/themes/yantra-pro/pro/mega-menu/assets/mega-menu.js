/**
 * Yantra Pro: Escape inside a mega menu closes it.
 *
 * Yantra's Escape closes the list focus is in. In a mega menu that is a column's list, which
 * always shows, so this runs first (capturing) and closes the whole dropdown instead, the way
 * Yantra closes a submenu: its button says closed, the item stays closed while focus is on it,
 * and focus goes back to the button.
 */
( () => {
	document.addEventListener(
		'keydown',
		( event ) => {
			if ( 'Escape' !== event.key || ! event.target.closest ) {
				return;
			}
			const item = event.target.closest( '.yantra-menu--header > li.themor-mega-menu' );
			const button = item && item.querySelector( ':scope > .yantra-submenu-toggle' );
			if ( ! button || ! event.target.closest( '.sub-menu' ) ) {
				return;
			}
			event.stopPropagation();
			button.setAttribute( 'aria-expanded', 'false' );
			item.classList.remove( 'is-open' );
			item.classList.add( 'is-closed' );
			button.focus();
		},
		true
	);
} )();
