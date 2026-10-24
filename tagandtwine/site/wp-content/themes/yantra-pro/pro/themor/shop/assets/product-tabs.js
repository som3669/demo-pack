/**
 * Product tabs: each block's tab row (includes/ProductTabs.php) shows one tab's products at a
 * time, as WAI-ARIA's tabs pattern has it. A click, the arrow keys, Home and End pick a tab and
 * show its panel; the other panels are hidden with `hidden`. Only the picked tab is in the Tab
 * order, and the tab row stays where it was on the screen, so a taller or shorter panel moves only
 * what is below it. Without this script every tab's products show one after another.
 */
( function () {
	var TAB = '.themor-product-tabs__tab[role="tab"]';

	/**
	 * A block's tab row and its tabs.
	 *
	 * @param {HTMLElement} root The block.
	 * @return {Object} `list` (the tab row, or null) and `tabs`.
	 */
	function parts( root ) {
		var list = root.querySelector( '.themor-product-tabs__tabs' );
		return {
			list: list,
			tabs: list ? Array.prototype.slice.call( list.querySelectorAll( TAB ) ) : [],
		};
	}

	/**
	 * The panel a tab shows.
	 *
	 * @param {HTMLElement} tab Tab.
	 * @return {HTMLElement|null} Its panel.
	 */
	function panelOf( tab ) {
		return document.getElementById( tab.getAttribute( 'aria-controls' ) || '' );
	}

	/**
	 * One tab picked: it is selected and in the Tab order, its panel shows, the others' hide.
	 *
	 * @param {Array}  tabs  The block's tabs.
	 * @param {number} index The tab picked.
	 */
	function show( tabs, index ) {
		tabs.forEach( function ( tab, at ) {
			var on = at === index;
			var panel = panelOf( tab );
			tab.setAttribute( 'aria-selected', on ? 'true' : 'false' );
			tab.setAttribute( 'tabindex', on ? '0' : '-1' );
			if ( panel ) {
				panel.hidden = ! on;
			}
		} );
	}

	/**
	 * A block made into tabs, once: its panels become tab panels, named by their tabs and
	 * reachable with the Tab key, and all but the picked tab's are hidden. The stylesheet then
	 * hides the tabs' names over the panels.
	 *
	 * @param {HTMLElement} root The block.
	 * @return {boolean} Whether it has tabs.
	 */
	function setUp( root ) {
		if ( root.classList.contains( 'is-tabbed' ) ) {
			return true;
		}
		var tabs = parts( root ).tabs;
		if ( ! tabs.length ) {
			return false;
		}
		var picked = -1;
		tabs.forEach( function ( tab, index ) {
			var panel = panelOf( tab );
			if ( panel ) {
				panel.setAttribute( 'role', 'tabpanel' );
				panel.setAttribute( 'aria-labelledby', tab.id );
				panel.setAttribute( 'tabindex', '0' );
			}
			if ( picked < 0 && 'true' === tab.getAttribute( 'aria-selected' ) ) {
				picked = index;
			}
		} );
		show( tabs, Math.max( 0, picked ) );
		root.classList.add( 'is-tabbed' );
		return true;
	}

	/**
	 * A tab scrolled into view inside its row, which scrolls sideways when the tabs don't fit,
	 * without scrolling the page.
	 *
	 * @param {HTMLElement} list The tab row.
	 * @param {HTMLElement} tab  The tab.
	 */
	function reveal( list, tab ) {
		var room = 8;
		var box = list.getBoundingClientRect();
		var rect = tab.getBoundingClientRect();
		if ( rect.left < box.left ) {
			list.scrollLeft -= box.left - rect.left + room;
		} else if ( rect.right > box.right ) {
			list.scrollLeft += rect.right - box.right + room;
		}
	}

	/**
	 * The page scrolled by some pixels at once, even where it scrolls smoothly.
	 *
	 * @param {number} by Pixels, down.
	 */
	function scrollPage( by ) {
		try {
			window.scrollBy( { top: by, left: 0, behavior: 'instant' } );
		} catch ( error ) {
			window.scrollBy( 0, by );
		}
	}

	/**
	 * A tab picked by a click or a key: its panel shows, the focus goes to it, and the page stays
	 * where it was. Should the tab row still have moved (a shorter panel at the foot of the page,
	 * where the page can't keep its scroll), the block keeps its height until the next tab is
	 * picked and the page scrolls back.
	 *
	 * @param {HTMLElement} root  The block.
	 * @param {number}      index The tab picked.
	 */
	function pick( root, index ) {
		var found = parts( root );
		var tab = found.tabs[ index ];
		if ( ! tab ) {
			return;
		}
		var before = found.list.getBoundingClientRect().top;
		var height = root.getBoundingClientRect().height;
		root.style.minBlockSize = '';
		show( found.tabs, index );
		if ( found.list.getBoundingClientRect().top !== before ) {
			root.style.minBlockSize = height + 'px';
			scrollPage( found.list.getBoundingClientRect().top - before );
		}
		if ( document.activeElement !== tab ) {
			tab.focus( { preventScroll: true } );
		}
		reveal( found.list, tab );
	}

	/**
	 * The block a tab is in, made into tabs if it isn't yet (one that arrived after the page
	 * loaded).
	 *
	 * @param {EventTarget} target What the event happened on.
	 * @return {Object|null} `root`, `tab` and its `index`, or null when it isn't a tab.
	 */
	function find( target ) {
		var tab = target && target.closest ? target.closest( TAB ) : null;
		var root = tab ? tab.closest( '.themor-product-tabs' ) : null;
		if ( ! root || ! setUp( root ) ) {
			return null;
		}
		var index = parts( root ).tabs.indexOf( tab );
		return index < 0 ? null : { root: root, tab: tab, index: index };
	}

	document.addEventListener( 'click', function ( event ) {
		var found = find( event.target );
		if ( found ) {
			pick( found.root, found.index );
		}
	} );

	document.addEventListener( 'keydown', function ( event ) {
		if ( event.altKey || event.ctrlKey || event.metaKey ) {
			return;
		}
		var found = find( event.target );
		if ( ! found ) {
			return;
		}
		var last = parts( found.root ).tabs.length - 1;
		// In right-to-left languages the row runs the other way, and so do the arrows.
		var step = 'rtl' === window.getComputedStyle( found.tab ).direction ? -1 : 1;
		var next;
		switch ( event.key ) {
			case 'ArrowRight':
				next = found.index + step;
				break;
			case 'ArrowLeft':
				next = found.index - step;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = last;
				break;
			default:
				return;
		}
		event.preventDefault();
		// Past either end, the arrows go round to the other.
		pick( found.root, next < 0 ? last : ( next > last ? 0 : next ) );
	} );

	function start() {
		Array.prototype.forEach.call( document.querySelectorAll( '.themor-product-tabs' ), setUp );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
}() );
