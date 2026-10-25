/**
 * Attribute finder: each block's select (includes/AttributeFinder.php) filters the products
 * under it in place. The cards that have the value picked show, as many as the block shows at
 * once (its `data-themor-finder`), every card with nothing picked; the others are `hidden`. The
 * line under the form says what shows, in words the site wrote for each choice (`data-status`),
 * through a polite live region, and "See all" goes to the category, filtered by the value picked
 * (`data-url`). The form's Show button, which sends the choice to the category's page without
 * scripts, hides.
 */
( function () {
	var BLOCK = '[data-themor-finder]';

	/**
	 * The block's products shown as its select says.
	 *
	 * @param {HTMLElement} block The block.
	 */
	function update( block ) {
		var select = block.querySelector( '.themor-finder__select' );
		if ( ! select ) {
			return;
		}
		var option = select.options[ select.selectedIndex ] || null;
		var wanted = option && option.value ? option.getAttribute( 'data-class' ) || '' : '';
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
		var words = option ? option.getAttribute( 'data-status' ) || '' : '';
		if ( status && status.textContent !== words ) {
			status.textContent = words;
		}
		var link = block.querySelector( '.themor-finder__link' );
		var url = option ? option.getAttribute( 'data-url' ) || '' : '';
		if ( link && url ) {
			link.setAttribute( 'href', url );
		}
	}

	/**
	 * A block set up once: its Show button hides, as the select now filters in place, and its
	 * products follow the select (a browser may have restored another choice).
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
		update( block );
	}

	document.addEventListener( 'change', function ( event ) {
		var select = event.target && event.target.closest ? event.target.closest( '.themor-finder__select' ) : null;
		var block = select ? select.closest( BLOCK ) : null;
		if ( block ) {
			start( block );
			update( block );
		}
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
