/**
 * Attribute finder: each block's choice (includes/AttributeFinder.php), its select or its row of
 * buttons, filters the products under it in place. The cards that have the value picked show, as
 * many as the block shows at once (its `data-themor-finder`), every card with nothing picked; the
 * others are `hidden`. The line under the form says what shows, in words the site wrote for each
 * choice (`data-status`), through a polite live region, and "See all" goes to the category,
 * filtered by the value picked (`data-url`). The form's Show button, which sends the choice to the
 * category's page without scripts, hides; the buttons, which send their own value without
 * scripts, pick in place instead.
 *
 * A block that remembers (`data-themor-finder-remember`, its attribute) keeps the choice as the
 * shopper's pick of the attribute (localStorage `themor-pick`, shared with the shop's pick,
 * assets/pick.js), starts on the pick already made, and follows a pick made elsewhere on the page
 * (`themor:pick` events).
 */
( function () {
	var BLOCK = '[data-themor-finder]';
	var KEY = 'themor-pick';

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
	 * Keep a block's choice as the pick of its attribute, and tell the page.
	 *
	 * @param {string} attribute The attribute's taxonomy.
	 * @param {string} slug      The value's slug, or '' for none.
	 */
	function keep( attribute, slug ) {
		var all = stored();
		if ( slug ) {
			all[ attribute ] = slug;
		} else {
			delete all[ attribute ];
		}
		try {
			window.localStorage.setItem( KEY, JSON.stringify( all ) );
		} catch ( error ) {}
		document.dispatchEvent( new window.CustomEvent( 'themor:pick', { detail: { attribute: attribute, value: slug, from: 'finder' } } ) );
	}

	/**
	 * The block's choices: the select's options, or its buttons.
	 *
	 * @param {HTMLElement} block The block.
	 * @return {Element[]} The choices.
	 */
	function choices( block ) {
		var select = block.querySelector( '.themor-finder__select' );
		return Array.prototype.slice.call( select ? select.options : block.querySelectorAll( '.themor-finder__choice' ) );
	}

	/**
	 * The choice made: the select's option, or the pressed button.
	 *
	 * @param {HTMLElement} block The block.
	 * @return {Element|null} The choice.
	 */
	function chosen( block ) {
		var select = block.querySelector( '.themor-finder__select' );
		if ( select ) {
			return select.options[ select.selectedIndex ] || null;
		}
		return block.querySelector( '.themor-finder__choice[aria-pressed="true"]' ) || block.querySelector( '.themor-finder__choice' );
	}

	/**
	 * Make a value the block's choice, if it has it.
	 *
	 * @param {HTMLElement} block The block.
	 * @param {string}      slug  The value's slug, '' for every product.
	 * @return {boolean} Whether the block has the value.
	 */
	function choose( block, slug ) {
		var found = choices( block ).filter( function ( choice ) {
			return choice.value === slug;
		} )[ 0 ];
		if ( ! found ) {
			return false;
		}
		var select = block.querySelector( '.themor-finder__select' );
		if ( select ) {
			select.value = slug;
		} else {
			choices( block ).forEach( function ( choice ) {
				choice.setAttribute( 'aria-pressed', choice === found ? 'true' : 'false' );
			} );
		}
		return true;
	}

	/**
	 * The block's products shown as its choice says.
	 *
	 * @param {HTMLElement} block The block.
	 */
	function update( block ) {
		var option = chosen( block );
		if ( ! option ) {
			return;
		}
		var wanted = option.value ? option.getAttribute( 'data-class' ) || '' : '';
		var most = parseInt( block.getAttribute( 'data-themor-finder' ), 10 ) || 4;
		var shown = 0;
		Array.prototype.forEach.call( block.querySelectorAll( '.themor-finder__products ul.products > li' ), function ( card ) {
			var fits = ! wanted || card.classList.contains( wanted );
			card.hidden = ! fits || shown >= most;
			if ( fits && shown < most ) {
				shown++;
			}
		} );
		var status = block.querySelector( '.themor-finder__status' );
		var words = option.getAttribute( 'data-status' ) || '';
		if ( status && status.textContent !== words ) {
			status.textContent = words;
		}
		var link = block.querySelector( '.themor-finder__link' );
		var url = option.getAttribute( 'data-url' ) || '';
		if ( link && url ) {
			link.setAttribute( 'href', url );
		}
	}

	/**
	 * A block set up once: its Show button hides, as the choice now filters in place; a block that
	 * remembers starts on the pick already made; and its products follow the choice (a browser may
	 * have restored another one).
	 *
	 * @param {HTMLElement} block The block.
	 */
	function start( block ) {
		if ( block.themorFinder ) {
			return;
		}
		block.themorFinder = true;
		var submit = block.querySelector( '.themor-finder__submit' );
		if ( submit ) {
			submit.hidden = true;
		}
		var attribute = block.getAttribute( 'data-themor-finder-remember' );
		if ( attribute ) {
			var pick = String( stored()[ attribute ] || '' );
			if ( pick ) {
				choose( block, pick );
			}
		}
		update( block );
	}

	/**
	 * After a choice is made in a block: its products, and the pick it keeps.
	 *
	 * @param {HTMLElement} block The block.
	 */
	function picked( block ) {
		update( block );
		var attribute = block.getAttribute( 'data-themor-finder-remember' );
		var option = chosen( block );
		if ( attribute && option ) {
			keep( attribute, option.value );
		}
	}

	document.addEventListener( 'change', function ( event ) {
		var select = event.target && event.target.closest ? event.target.closest( '.themor-finder__select' ) : null;
		var block = select ? select.closest( BLOCK ) : null;
		if ( block ) {
			start( block );
			picked( block );
		}
	} );

	document.addEventListener( 'click', function ( event ) {
		var button = event.target && event.target.closest ? event.target.closest( '.themor-finder__choice' ) : null;
		var block = button ? button.closest( BLOCK ) : null;
		if ( ! block ) {
			return;
		}
		event.preventDefault();
		start( block );
		choose( block, button.value );
		picked( block );
	} );

	// A pick made elsewhere: the shop's window, or another block.
	document.addEventListener( 'themor:pick', function ( event ) {
		var detail = event.detail || {};
		Array.prototype.forEach.call( document.querySelectorAll( '[data-themor-finder-remember]' ), function ( block ) {
			if ( block.getAttribute( 'data-themor-finder-remember' ) === detail.attribute && chosen( block ) && chosen( block ).value !== ( detail.value || '' ) ) {
				if ( choose( block, detail.value || '' ) ) {
					update( block );
				}
			}
		} );
	} );

	function startAll() {
		Array.prototype.forEach.call( document.querySelectorAll( BLOCK ), start );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', startAll );
	} else {
		startAll();
	}

	// Back from another page, the browser may bring the select back with an earlier choice.
	window.addEventListener( 'pageshow', function ( event ) {
		if ( event.persisted ) {
			Array.prototype.forEach.call( document.querySelectorAll( BLOCK ), update );
		}
	} );
}() );
