/**
 * Yantra: the site's script. No dependencies.
 *
 * - Dialogs: the drawer and the pop-up search open as modal <dialog>s, so the browser keeps
 *   focus inside and Escape closes them; focus returns to the button that opened them.
 * - Search panels: the dropdown search and the bar across a header row open from their
 *   button, with focus in the field, and close again on the button, Escape, a click
 *   elsewhere or focus moving on.
 * - Submenus: each submenu button opens and closes its submenu (hover and keyboard focus
 *   open header submenus too, in CSS); Escape closes the one focus is in.
 * - Back to top: the button shows once the page has scrolled.
 * - Sticky sidebar: held below a header that stays on screen, and one taller than the window
 *   held by its bottom, so its last widgets can be reached (--yantra-sidebar-top).
 *
 * Events are caught on the document, so parts the Customizer redraws keep working.
 * Minified to theme.min.js by gulpfile.mjs, which is the copy the theme loads.
 */
( function () {
	'use strict';

	const doc = document;
	let opener = null;

	/**
	 * Tell other scripts (such as an add-on's) what happened.
	 *
	 * @param {string} name   Event name, after `yantra:`.
	 * @param {Object} detail Event detail.
	 */
	function emit( name, detail ) {
		doc.dispatchEvent( new CustomEvent( 'yantra:' + name, { detail } ) );
	}

	/**
	 * Open a dialog as a modal.
	 *
	 * @param {HTMLDialogElement} dialog Dialog.
	 * @param {HTMLElement}       button Button that opened it.
	 */
	function openDialog( dialog, button ) {
		if ( dialog.open ) {
			return;
		}
		opener = button;
		if ( 'function' === typeof dialog.showModal ) {
			dialog.showModal();
		} else {
			dialog.setAttribute( 'open', '' );
		}
		doc.body.classList.add( 'yantra-dialog-open' );
		doc.querySelectorAll( '[aria-controls="' + dialog.id + '"]' ).forEach( ( control ) => control.setAttribute( 'aria-expanded', 'true' ) );

		const field = dialog.querySelector( 'input[type="search"]' );
		if ( field ) {
			field.focus();
		}
		emit( 'dialog-open', { dialog } );
	}

	/**
	 * Close a dialog.
	 *
	 * @param {HTMLDialogElement} dialog Dialog.
	 */
	function closeDialog( dialog ) {
		if ( 'function' === typeof dialog.close ) {
			dialog.close();
		} else {
			dialog.removeAttribute( 'open' );
			onClosed( dialog );
		}
	}

	/**
	 * Tidy up once a dialog has closed, however it closed.
	 *
	 * @param {HTMLDialogElement} dialog Dialog.
	 */
	function onClosed( dialog ) {
		doc.body.classList.remove( 'yantra-dialog-open' );
		doc.querySelectorAll( '[aria-controls="' + dialog.id + '"]' ).forEach( ( control ) => control.setAttribute( 'aria-expanded', 'false' ) );
		if ( opener && doc.contains( opener ) ) {
			opener.focus();
		}
		opener = null;
		emit( 'dialog-close', { dialog } );
	}

	/**
	 * The button of the search panel open now, if one is.
	 *
	 * @type {HTMLButtonElement|null}
	 */
	let searchButton = null;

	/**
	 * Open or close a search panel (a dropdown, or a bar across its header row).
	 *
	 * @param {HTMLButtonElement} button Its button.
	 * @param {boolean}           open   Whether to open it.
	 * @param {boolean}           focus  On closing, whether focus goes back to the button.
	 */
	function setSearch( button, open, focus = false ) {
		const search = button.closest( '.yantra-search' );
		const panel = search && search.querySelector( '.yantra-search-panel' );
		if ( open && searchButton && searchButton !== button ) {
			setSearch( searchButton, false );
		}
		searchButton = open ? button : null;
		if ( ! panel ) {
			return;
		}
		button.setAttribute( 'aria-expanded', String( open ) );
		panel.hidden = ! open;
		const row = button.closest( '.yantra-header-row' );
		if ( row && search.classList.contains( 'yantra-search--cover' ) ) {
			row.classList.toggle( 'yantra-header-row--searching', open );
		}
		if ( open ) {
			fitSearch( search, panel );
			const field = panel.querySelector( 'input[type="search"]' );
			if ( field ) {
				field.focus();
			}
		} else if ( focus ) {
			button.focus();
		}
		emit( open ? 'search-open' : 'search-close', { panel } );
	}

	/**
	 * Open a desktop dropdown toward the other side when it would leave the screen (its button
	 * near the start of the header). On tablets and phones it spans the row instead (CSS).
	 *
	 * @param {HTMLElement} search The search element.
	 * @param {HTMLElement} panel  Its panel.
	 */
	function fitSearch( search, panel ) {
		search.classList.remove( 'yantra-search--start' );
		if ( search.classList.contains( 'yantra-search--cover' ) || search.closest( '.yantra-header__mobile' ) ) {
			return;
		}
		const rect = panel.getBoundingClientRect();
		const rtl = 'rtl' === window.getComputedStyle( search ).direction;
		if ( rtl ? rect.right > doc.documentElement.clientWidth : rect.left < 0 ) {
			search.classList.add( 'yantra-search--start' );
		}
	}

	/**
	 * Open or close a submenu.
	 *
	 * @param {HTMLButtonElement} button Its button.
	 * @param {boolean}           open   Whether to open it.
	 * @param {boolean}           hold   Keep it closed while the pointer or focus stays on the
	 *                                   item (when its own button closed it).
	 */
	function setSubmenu( button, open, hold = false ) {
		const item = button.closest( 'li' );
		if ( ! item ) {
			return;
		}
		button.setAttribute( 'aria-expanded', String( open ) );
		item.classList.toggle( 'is-open', open );
		item.classList.toggle( 'is-closed', ! open && hold );
		if ( open ) {
			fitSubmenu( item );
		}
	}

	/**
	 * Open a header submenu toward the other side when it would leave the screen.
	 *
	 * @param {HTMLLIElement} item Menu item holding the submenu.
	 */
	function fitSubmenu( item ) {
		const submenu = item.querySelector( ':scope > .sub-menu' );
		if ( ! submenu || ! item.closest( '.yantra-menu--header' ) ) {
			return;
		}
		item.classList.remove( 'yantra-submenu--flip' );
		const rect = submenu.getBoundingClientRect();
		if ( ! rect.width ) {
			return;
		}
		const rtl = 'rtl' === window.getComputedStyle( item ).direction;
		if ( rtl ? rect.left < 0 : rect.right > doc.documentElement.clientWidth ) {
			item.classList.add( 'yantra-submenu--flip' );
		}
	}

	/**
	 * Fit the submenu of the item the pointer or focus has just entered.
	 *
	 * @param {Event} event mouseover or focusin.
	 */
	function onEnter( event ) {
		const item = event.target.closest && event.target.closest( '.yantra-menu--header li' );
		if ( item && ( ! event.relatedTarget || ! item.contains( event.relatedTarget ) ) ) {
			fitSubmenu( item );
		}
	}

	doc.addEventListener( 'mouseover', onEnter );
	doc.addEventListener( 'focusin', onEnter );

	/**
	 * Close the open submenus in `scope`, except the one holding `keep`.
	 *
	 * @param {Element}      scope Where to look.
	 * @param {Element|null} keep  An element whose submenus stay open.
	 */
	function closeSubmenus( scope, keep ) {
		scope.querySelectorAll( '.yantra-menu--header li.is-open > .yantra-submenu-toggle' ).forEach( ( button ) => {
			if ( ! keep || ! button.parentElement.contains( keep ) ) {
				setSubmenu( button, false );
			}
		} );
	}

	doc.addEventListener( 'click', ( event ) => {
		const target = event.target;

		// Search buttons that open a panel, its close button, and a click outside it.
		const searchToggle = target.closest( '.yantra-search-toggle:not([aria-haspopup])' );
		if ( searchToggle ) {
			closeSubmenus( doc, null );
			setSearch( searchToggle, 'true' !== searchToggle.getAttribute( 'aria-expanded' ) );
			return;
		}
		if ( searchButton ) {
			if ( target.closest( '[data-yantra-search-close]' ) ) {
				setSearch( searchButton, false, true );
				return;
			}
			const search = searchButton.closest( '.yantra-search' );
			if ( ! search || ! search.contains( target ) ) {
				setSearch( searchButton, false );
			}
		}

		// Buttons that open a dialog.
		const control = target.closest( '[aria-haspopup="dialog"][aria-controls]' );
		if ( control ) {
			const dialog = doc.getElementById( control.getAttribute( 'aria-controls' ) );
			if ( dialog && 'DIALOG' === dialog.tagName ) {
				event.preventDefault();
				openDialog( dialog, control );
				return;
			}
		}

		// Close buttons, a click on the backdrop, and links inside the drawer.
		const dialog = target.closest( 'dialog' );
		if ( dialog ) {
			if ( target.closest( '[data-yantra-close]' ) || target === dialog ) {
				closeDialog( dialog );
				return;
			}
			const link = target.closest( 'a[href]' );
			if ( link && dialog.classList.contains( 'yantra-drawer' ) && ! link.closest( '.menu-item-has-children > .sub-menu' ) && link.hash && link.pathname === window.location.pathname ) {
				closeDialog( dialog );
			}
		}

		// Submenu buttons.
		const toggle = target.closest( '.yantra-submenu-toggle' );
		if ( toggle ) {
			const open = 'true' !== toggle.getAttribute( 'aria-expanded' );
			if ( open ) {
				closeSubmenus( doc, toggle );
			}
			setSubmenu( toggle, open, ! open );
			return;
		}

		// A click elsewhere closes the header's open submenus.
		if ( ! target.closest( '.yantra-menu--header' ) ) {
			closeSubmenus( doc, null );
		}
	} );

	// A dialog closed by Escape or by the browser.
	doc.addEventListener(
		'close',
		( event ) => {
			if ( event.target instanceof HTMLElement && 'DIALOG' === event.target.tagName ) {
				onClosed( event.target );
			}
		},
		true
	);

	// Escape closes the search panel or the submenu focus is in, and focus goes back to its button.
	doc.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' !== event.key ) {
			return;
		}
		const search = searchButton && searchButton.closest( '.yantra-search' );
		if ( search && search.contains( event.target ) ) {
			setSearch( searchButton, false, true );
			return;
		}
		const submenu = event.target.closest && event.target.closest( '.yantra-menu--header .sub-menu' );
		if ( submenu ) {
			const button = submenu.parentElement.querySelector( ':scope > .yantra-submenu-toggle' );
			if ( button ) {
				setSubmenu( button, false, true );
				button.focus();
			}
		}
	} );

	// Focus moving on from the open search panel closes it (not the window losing focus).
	doc.addEventListener( 'focusout', ( event ) => {
		const search = searchButton && searchButton.closest( '.yantra-search' );
		if ( search && event.relatedTarget && search.contains( event.target ) && ! search.contains( event.relatedTarget ) ) {
			setSearch( searchButton, false );
		}
	} );

	// Focus leaving a header item closes its submenu, and lets focus open it again later.
	doc.addEventListener( 'focusout', ( event ) => {
		const item = event.target.closest && event.target.closest( '.yantra-menu--header li:is(.is-open, .is-closed)' );
		if ( item && ( ! event.relatedTarget || ! item.contains( event.relatedTarget ) ) ) {
			const button = item.querySelector( ':scope > .yantra-submenu-toggle' );
			if ( button ) {
				setSubmenu( button, false );
			}
		}
	} );

	// The pointer leaving an item lets hover open its submenu again.
	doc.addEventListener( 'mouseout', ( event ) => {
		const item = event.target.closest && event.target.closest( 'li.is-closed' );
		if ( item && ( ! event.relatedTarget || ! item.contains( event.relatedTarget ) ) && ! item.contains( doc.activeElement ) ) {
			item.classList.remove( 'is-closed' );
		}
	} );

	// Back to top.
	let ticking = false;
	function updateScrollTop() {
		ticking = false;
		const button = doc.querySelector( '.yantra-scroll-top' );
		if ( button ) {
			button.classList.toggle( 'is-visible', window.scrollY > 600 );
		}
	}
	window.addEventListener(
		'scroll',
		() => {
			if ( ! ticking ) {
				ticking = true;
				window.requestAnimationFrame( updateScrollTop );
			}
		},
		{ passive: true }
	);
	updateScrollTop();

	// Sticky sidebar: below the admin bar and a header that stays on screen, with a gap; taller
	// than the window, it stops with its bottom a gap above the window's.
	const sidebar = doc.querySelector( '.yantra-sidebar--sticky .yantra-sidebar' );
	if ( sidebar ) {
		const header = doc.querySelector( '.yantra-header' );
		const fitSidebar = () => {
			const gap = 32;
			const adminBar = parseFloat( getComputedStyle( doc.documentElement ).getPropertyValue( '--wp-admin--admin-bar--height' ) ) || 0;
			let top = adminBar + gap;
			if ( header && [ 'sticky', 'fixed' ].includes( getComputedStyle( header ).position ) ) {
				top += header.offsetHeight;
			}
			const bottom = window.innerHeight - sidebar.offsetHeight - gap;
			sidebar.style.setProperty( '--yantra-sidebar-top', `${ Math.round( Math.min( top, bottom ) ) }px` );
		};
		window.addEventListener( 'resize', fitSidebar, { passive: true } );
		if ( 'ResizeObserver' in window ) {
			const observer = new window.ResizeObserver( fitSidebar );
			observer.observe( sidebar );
			if ( header ) {
				observer.observe( header );
			}
		}
		fitSidebar();
	}
}() );
