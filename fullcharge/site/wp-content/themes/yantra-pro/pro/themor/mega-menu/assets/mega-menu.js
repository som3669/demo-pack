/**
 * Themor mega menu on the site (loaded only where a mega menu needs it, see MegaMenu::enqueue()):
 *
 * - The custom content of mega menus set to load it when needed: fetched once, the first time
 *   the pointer moves, a key is pressed or the page is touched, and kept in the browser until
 *   the settings change (their version is in the key and the address).
 * - Mega menus of a width of their own, centered on their item: kept a little inside the window.
 */
( () => {
	const doc = document;
	const settings = window.themorMegaMenu || {};
	const KEY = 'themor-mega-menu:';
	const PLACE = '[data-themor-mega-content]';

	/**
	 * Put the loaded content in its places.
	 *
	 * @param {Object} items Item ID => markup.
	 */
	function fill( items ) {
		doc.querySelectorAll( PLACE ).forEach( ( place ) => {
			const html = items[ place.dataset.themorMegaContent ];
			if ( undefined !== html ) {
				place.innerHTML = html;
				place.removeAttribute( 'data-themor-mega-content' );
			}
			place.removeAttribute( 'aria-busy' );
		} );
	}

	function load() {
		const places = [ ...doc.querySelectorAll( PLACE ) ];
		if ( ! places.length || ! settings.content ) {
			return;
		}
		const ids = [ ...new Set( places.map( ( place ) => place.dataset.themorMegaContent ) ) ].sort();
		const key = `${ KEY }${ settings.version }:${ ids.join( ',' ) }`;
		try {
			const kept = window.localStorage.getItem( key );
			if ( kept ) {
				fill( JSON.parse( kept ) );
				return;
			}
		} catch ( error ) {
			// No storage: fetch it.
		}
		const url = new URL( settings.content, window.location.href );
		url.searchParams.set( 'items', ids.join( ',' ) );
		url.searchParams.set( 'v', settings.version );
		if ( settings.lang ) {
			url.searchParams.set( 'lang', settings.lang );
		}
		fetch( url, { credentials: 'omit' } )
			.then( ( response ) => ( response.ok ? response.json() : Promise.reject( response ) ) )
			.then( ( data ) => {
				const items = ( data && data.items ) || {};
				fill( items );
				try {
					Object.keys( window.localStorage )
						.filter( ( name ) => 0 === name.indexOf( KEY ) && name !== key )
						.forEach( ( name ) => window.localStorage.removeItem( name ) );
					window.localStorage.setItem( key, JSON.stringify( items ) );
				} catch ( error ) {
					// Kept for this page only.
				}
			} )
			.catch( () => fill( {} ) );
	}

	if ( doc.querySelector( PLACE ) ) {
		const events = [ 'pointermove', 'touchstart', 'keydown', 'focusin' ];
		const first = () => {
			events.forEach( ( name ) => doc.removeEventListener( name, first, true ) );
			load();
		};
		events.forEach( ( name ) => doc.addEventListener( name, first, { capture: true, passive: true } ) );
	}

	const EDGE = 16;

	/**
	 * Shift a centered mega menu of its own width back inside the window when it would leave it.
	 *
	 * @param {HTMLElement} item Top-level item.
	 */
	function fit( item ) {
		const dropdown = item.querySelector( ':scope > .sub-menu' );
		if ( ! dropdown ) {
			return;
		}
		item.style.removeProperty( '--themor-mega-shift' );
		const rect = dropdown.getBoundingClientRect();
		if ( ! rect.width ) {
			return;
		}
		const room = doc.documentElement.clientWidth;
		let shift = 0;
		if ( rect.left < EDGE ) {
			shift = EDGE - rect.left;
		} else if ( rect.right > room - EDGE ) {
			shift = room - EDGE - rect.right;
		}
		if ( shift ) {
			// The shift runs along the inline direction: to the left in right-to-left text.
			const rtl = 'rtl' === window.getComputedStyle( item ).direction;
			item.style.setProperty( '--themor-mega-shift', `${ Math.round( rtl ? -shift : shift ) }px` );
		}
	}

	const onEnter = ( event ) => {
		const item = event.target.closest && event.target.closest( '.themor-mega-menu--custom.themor-mega-menu--align-center' );
		if ( item && ( ! event.relatedTarget || ! item.contains( event.relatedTarget ) ) ) {
			fit( item );
		}
	};
	doc.addEventListener( 'mouseover', onEnter );
	doc.addEventListener( 'focusin', onEnter );
} )();
