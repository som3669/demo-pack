/**
 * The shopper's pick (includes/Pick.php): their value of one attribute, such as their skin type,
 * kept in this browser (localStorage `themor-pick`, the value's slug by attribute) and marked all
 * over the page: each product's mark says "Suits combination skin" where the product has the
 * value (else what the site printed, "Best for dry and sensitive skin"), the header item shows the
 * pick, the window's choices say which is picked, and on the shop's pages the switch "Only what
 * suits combination skin" links to the page filtered by it (or, once on, back without it).
 * Picking in the window (or in an Attribute finder block that remembers) keeps it and marks the
 * page again; so do marks that come in later (more products, quick view) and a pick made in
 * another tab. What it reads comes from `window.themorPick` (Pick::enqueue()).
 */
( function () {
	var data = window.themorPick;
	if ( ! data || ! data.attribute ) {
		return;
	}
	var KEY = 'themor-pick';
	var values = data.values || {};
	var words = data.words || {};
	var TICK = 'm5 12.5 4.5 4.5L19 7';
	var DROP = 'M12 3c3.2 4.2 6.5 7.5 6.5 11a6.5 6.5 0 0 1-13 0C5.5 10.5 8.8 7.2 12 3z';

	/**
	 * Every attribute's pick kept in this browser.
	 *
	 * @return {Object} Attribute => slug.
	 */
	function stored() {
		try {
			var all = JSON.parse( window.localStorage.getItem( KEY ) || '{}' );
			return all && 'object' === typeof all && ! Array.isArray( all ) ? all : {};
		} catch ( error ) {
			return {};
		}
	}

	/**
	 * The pick of this store's attribute, while it is one of its values; else ''.
	 *
	 * @return {string} Slug.
	 */
	function current() {
		var slug = String( stored()[ data.attribute ] || '' );
		return Object.prototype.hasOwnProperty.call( values, slug ) ? slug : '';
	}

	/**
	 * Keep a pick (or forget it, for ''), and tell the page.
	 *
	 * @param {string} slug The value's slug.
	 */
	function keep( slug ) {
		var all = stored();
		if ( slug ) {
			all[ data.attribute ] = slug;
		} else {
			delete all[ data.attribute ];
		}
		try {
			window.localStorage.setItem( KEY, JSON.stringify( all ) );
		} catch ( error ) {}
		document.dispatchEvent( new window.CustomEvent( 'themor:pick', { detail: { attribute: data.attribute, value: slug, from: 'pick' } } ) );
	}

	/**
	 * A value's name as the header shows it, or as the words show it.
	 *
	 * @param {string}  slug  The value's slug.
	 * @param {boolean} words Whether for the words (maybe in lower case).
	 * @return {string} Name.
	 */
	function nameOf( slug, words ) {
		var value = values[ slug ] || {};
		return String( ( words ? value.shown : value.name ) || '' );
	}

	/**
	 * Words with a name in place of `%s`.
	 *
	 * @param {string} text The words.
	 * @param {string} name The name.
	 * @return {string} The words.
	 */
	function fill( text, name ) {
		return String( text || '%s' ).replace( '%s', name );
	}

	/**
	 * Names in a list: "dry", "dry and sensitive".
	 *
	 * @param {string[]} names Names.
	 * @return {string} The list.
	 */
	function listed( names ) {
		if ( names.length < 2 ) {
			return names[ 0 ] || '';
		}
		var last = names[ names.length - 1 ];
		return String( words.and || '%1$s and %2$s' ).replace( '%1$s', names.slice( 0, -1 ).join( ', ' ) ).replace( '%2$s', last );
	}

	/**
	 * Mark one product: the pick's words where it has the value (or every value), else the
	 * words for its own first two.
	 *
	 * @param {Element} mark The product's mark.
	 * @param {string}  pick The pick, or ''.
	 */
	function markOne( mark, pick ) {
		var slugs = String( mark.getAttribute( 'data-themor-pick' ) || '' ).split( /\s+/ ).filter( Boolean );
		var every = mark.hasAttribute( 'data-themor-pick-every' );
		var match = every || ( pick && slugs.indexOf( pick ) !== -1 );
		var text = mark.querySelector( '.themor-pick__text' );
		var path = mark.querySelector( '.themor-pick__icon path' );
		if ( text ) {
			if ( every ) {
				text.textContent = words.all || '';
			} else if ( match ) {
				text.textContent = fill( words.yes, nameOf( pick, true ) );
			} else {
				text.textContent = fill(
					words.no,
					listed(
						slugs.slice( 0, 2 ).map( function ( slug ) {
							return nameOf( slug, true );
						} )
					)
				);
			}
		}
		if ( path ) {
			path.setAttribute( 'd', match ? TICK : DROP );
		}
		mark.classList.toggle( 'is-match', !! match );
	}

	/**
	 * The switch on the shop's pages: hidden without a pick; else it links to this page filtered
	 * by the pick, or, while it is, back without the filter.
	 *
	 * @param {Element} link The switch.
	 * @param {string}  pick The pick, or ''.
	 */
	function markSwitch( link, pick ) {
		if ( ! pick ) {
			link.hidden = true;
			return;
		}
		var base = link.getAttribute( 'data-base' ) || window.location.href;
		var here = new window.URL( window.location.href );
		var on = here.searchParams.get( data.param ) === pick;
		var url = new window.URL( base, window.location.href );
		if ( ! on ) {
			url.searchParams.set( data.param, pick );
		}
		link.href = url.toString();
		link.setAttribute( 'aria-checked', on ? 'true' : 'false' );
		var text = link.querySelector( '.themor-pick-only__text' );
		if ( text ) {
			text.textContent = fill( words.only, nameOf( pick, true ) );
		}
		link.hidden = false;
	}

	/**
	 * Mark the page from the pick.
	 */
	function apply() {
		var pick = current();
		document.querySelectorAll( '[data-themor-pick]' ).forEach( function ( mark ) {
			markOne( mark, pick );
		} );
		document.querySelectorAll( '[data-themor-pick-name]' ).forEach( function ( name ) {
			name.textContent = pick ? nameOf( pick, false ) : words.choose || '';
		} );
		document.querySelectorAll( '.themor-pick-item' ).forEach( function ( item ) {
			item.classList.toggle( 'is-picked', !! pick );
		} );
		document.querySelectorAll( '[data-themor-pick-value]' ).forEach( function ( choice ) {
			var slug = choice.getAttribute( 'data-themor-pick-value' );
			if ( slug ) {
				choice.setAttribute( 'aria-pressed', slug === pick ? 'true' : 'false' );
			} else {
				choice.hidden = ! pick;
			}
		} );
		document.querySelectorAll( '[data-themor-pick-only]' ).forEach( function ( link ) {
			markSwitch( link, pick );
		} );
	}

	document.addEventListener( 'click', function ( event ) {
		var choice = event.target && event.target.closest ? event.target.closest( '[data-themor-pick-value]' ) : null;
		if ( ! choice ) {
			return;
		}
		event.preventDefault();
		keep( choice.getAttribute( 'data-themor-pick-value' ) || '' );
		apply();
		var dialog = choice.closest( 'dialog' );
		if ( dialog && dialog.open ) {
			dialog.close();
		}
	} );

	// A pick made elsewhere on the page (an Attribute finder that remembers) or in another tab.
	document.addEventListener( 'themor:pick', function ( event ) {
		if ( event.detail && event.detail.from !== 'pick' && event.detail.attribute === data.attribute ) {
			apply();
		}
	} );
	window.addEventListener( 'storage', function ( event ) {
		if ( KEY === event.key ) {
			apply();
		}
	} );

	apply();

	// Marks that come in later: more products, filtering without reloading, quick view.
	if ( 'MutationObserver' in window ) {
		var queued = false;
		new window.MutationObserver( function ( records ) {
			if ( queued ) {
				return;
			}
			var found = records.some( function ( record ) {
				return Array.prototype.some.call( record.addedNodes, function ( node ) {
					return 1 === node.nodeType && ( node.matches( '[data-themor-pick], [data-themor-pick-only]' ) || node.querySelector( '[data-themor-pick], [data-themor-pick-only]' ) );
				} );
			} );
			if ( found ) {
				queued = true;
				window.requestAnimationFrame( function () {
					queued = false;
					apply();
				} );
			}
		} ).observe( document.body, { childList: true, subtree: true } );
	}
}() );
